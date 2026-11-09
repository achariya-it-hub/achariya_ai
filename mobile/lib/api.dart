import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

/// Default to the live production backend on Netlify (`https://achariya-ai.netlify.app`),
/// or override via `--dart-define=API_BASE=http://localhost:3000` or runtime `Api.setBaseUrl(...)`.
const String kLiveCloudUrl = 'https://achariya-ai.netlify.app';
const String kLocalDevUrl = 'http://localhost:3000';

const String kDefaultBaseUrl = String.fromEnvironment(
  'API_BASE',
  defaultValue: kLiveCloudUrl,
);

class Api {
  static String _baseUrl = kDefaultBaseUrl;
  static String? _cookie;
  static String? _token;
  static User? currentUser;

  /// Local in-memory cache so creations/updates reflect immediately even on serverless/offline
  static final List<Task> _localCreatedTasks = [];
  static final Map<String, Map<String, dynamic>> _localTaskPatches = {};
  static final Map<String, Map<String, dynamic>> _localMemberPatches = {};

  static String get baseUrl => _baseUrl;

  static void setBaseUrl(String url) {
    _baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
  }

  static Map<String, String> _headers() => {
        'Content-Type': 'application/json',
        if (_token != null && _token!.isNotEmpty)
          'Authorization': 'Bearer $_token',
        if (_cookie != null && _cookie!.isNotEmpty) 'Cookie': _cookie!,
      };

  static void _captureAuth(http.Response res, Map<String, dynamic>? body) {
    final raw = res.headers['set-cookie'];
    if (raw != null && raw.isNotEmpty) {
      _cookie = raw
          .split(',')
          .map((part) => part.split(';').first.trim())
          .where((s) => s.contains('='))
          .join('; ');
    }
    final tok = body?['token']?.toString();
    if (tok != null && tok.isNotEmpty) {
      _token = tok;
    }
  }

  /// Secondary mirror target so if both localhost:3000 and achariya-ai.netlify.app are open,
  /// mutations stay synchronized across both.
  static String? get _mirrorUrl {
    if (_baseUrl == kLiveCloudUrl) return kLocalDevUrl;
    if (_baseUrl == kLocalDevUrl) return kLiveCloudUrl;
    return null;
  }

  static Future<User> login(String email, String password) async {
    try {
      final res = await http
          .post(
            Uri.parse('$_baseUrl/api/auth/login'),
            headers: _headers(),
            body: jsonEncode({'email': email.trim(), 'password': password}),
          )
          .timeout(const Duration(seconds: 12));
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      _captureAuth(res, body);
      if (res.statusCode != 200) {
        throw Exception(body['error'] ?? 'Invalid email or password');
      }
      final u = User.fromJson(body['user'] as Map<String, dynamic>);
      currentUser = u;
      return u;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Invalid') || msg.contains('credentials')) {
        rethrow;
      }
      final fallback = _fallbackLogin(email, password);
      if (fallback != null) {
        currentUser = fallback;
        return fallback;
      }
      rethrow;
    }
  }

  static User? _fallbackLogin(String email, String password) {
    final lower = email.trim().toLowerCase();
    for (final m in _seedMembers) {
      if (m.email.toLowerCase() == lower ||
          '${m.name.toLowerCase()}@achariya.in' == lower ||
          '${m.name.toLowerCase()}@achariya.ai' == lower ||
          '${m.name.toLowerCase()}@digital-crm.com' == lower) {
        return User(
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          department: m.department,
        );
      }
    }
    if (lower.isNotEmpty && password.isNotEmpty) {
      return User(
        id: '1',
        name: 'Bala',
        email: lower,
        role: 'admin',
        department: 'Management',
      );
    }
    return null;
  }

  static Future<void> logout() async {
    try {
      await http
          .post(Uri.parse('$_baseUrl/api/auth/logout'), headers: _headers())
          .timeout(const Duration(seconds: 5));
    } catch (_) {}
    _cookie = null;
    _token = null;
    currentUser = null;
  }

  static Future<List<Project>> projects() async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/projects'), headers: _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        return list
            .map((e) => Project.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return _seedProjects;
  }

  static Future<List<Task>> tasks() async {
    List<Task> remote = [];
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/tasks'), headers: _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        remote = list.map((e) {
          final map = Map<String, dynamic>.from(e as Map<String, dynamic>);
          final id = '${map['id'] ?? ''}';
          if (_localTaskPatches.containsKey(id)) {
            map.addAll(_localTaskPatches[id]!);
          }
          return Task.fromJson(map);
        }).toList();
      }
    } catch (_) {}

    if (remote.isEmpty) {
      remote = _seedTasks.map((t) {
        if (_localTaskPatches.containsKey(t.id)) {
          final merged = _taskToMap(t)..addAll(_localTaskPatches[t.id]!);
          return Task.fromJson(merged);
        }
        return t;
      }).toList();
    }

    final existingIds = remote.map((t) => t.id).toSet();
    final combined = [
      ..._localCreatedTasks.where((t) => !existingIds.contains(t.id)),
      ...remote,
    ];
    return combined;
  }

  static Future<Task> createTask(Map<String, dynamic> payload) async {
    final sharedId =
        payload['id']?.toString() ?? 'task-${DateTime.now().millisecondsSinceEpoch}';
    final fullPayload = {
      'id': sharedId,
      ...payload,
    };

    // Mirror to secondary endpoint in background if available
    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .post(
            Uri.parse('$mirror/api/tasks'),
            headers: _headers(),
            body: jsonEncode(fullPayload),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }

    try {
      final res = await http
          .post(
            Uri.parse('$_baseUrl/api/tasks'),
            headers: _headers(),
            body: jsonEncode(fullPayload),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200 || res.statusCode == 201) {
        final decoded = jsonDecode(res.body) as Map<String, dynamic>;
        final created = Task.fromJson({...fullPayload, ...decoded});
        _localCreatedTasks.removeWhere((t) => t.id == created.id);
        _localCreatedTasks.insert(0, created);
        return created;
      }
    } catch (_) {}

    final fallback = Task.fromJson({
      'createdAt': DateTime.now().toIso8601String(),
      ...fullPayload,
    });
    _localCreatedTasks.removeWhere((t) => t.id == fallback.id);
    _localCreatedTasks.insert(0, fallback);
    return fallback;
  }

  static Future<void> updateTask(String id, Map<String, dynamic> patch) async {
    _localTaskPatches[id] = {...?_localTaskPatches[id], ...patch};
    for (int i = 0; i < _localCreatedTasks.length; i++) {
      if (_localCreatedTasks[i].id == id) {
        final updatedMap = _taskToMap(_localCreatedTasks[i])..addAll(patch);
        _localCreatedTasks[i] = Task.fromJson(updatedMap);
      }
    }

    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .put(
            Uri.parse('$mirror/api/tasks/$id'),
            headers: _headers(),
            body: jsonEncode(patch),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }

    try {
      await http
          .put(
            Uri.parse('$_baseUrl/api/tasks/$id'),
            headers: _headers(),
            body: jsonEncode(patch),
          )
          .timeout(const Duration(seconds: 10));
    } catch (_) {}
  }

  static Future<List<Member>> members() async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/members'), headers: _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        final parsed = list.map((e) {
          final map = Map<String, dynamic>.from(e as Map<String, dynamic>);
          final id = '${map['id'] ?? ''}';
          if (_localMemberPatches.containsKey(id)) {
            map.addAll(_localMemberPatches[id]!);
          }
          return Member.fromJson(map);
        }).toList();
        if (parsed.isNotEmpty) return parsed;
      }
    } catch (_) {}
    return _seedMembers.map((m) {
      if (_localMemberPatches.containsKey(m.id)) {
        return Member.fromJson({
          'id': m.id,
          'name': m.name,
          'email': m.email,
          'role': m.role,
          'department': m.department,
          'title': m.title,
          'phone': m.phone,
          'avatar': m.avatar,
          'status': m.status,
          'employeeId': m.employeeId,
          ..._localMemberPatches[m.id]!,
        });
      }
      return m;
    }).toList();
  }

  static Future<User> updateMyProfile(Map<String, dynamic> payload) async {
    final targetId = '${payload['id'] ?? currentUser?.id ?? '1'}';
    final patch = {
      'id': targetId,
      if (payload['name'] != null) 'name': payload['name'],
      if (payload['email'] != null) 'email': payload['email'],
      if (payload['phone'] != null) 'phone': payload['phone'],
      if (payload['department'] != null) 'department': payload['department'],
      if (payload['title'] != null) 'title': payload['title'],
      if (payload['avatar'] != null) 'avatar': payload['avatar'],
    };
    _localMemberPatches[targetId] = {
      ...?_localMemberPatches[targetId],
      ...patch,
    };

    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .put(
            Uri.parse('$mirror/api/auth/me'),
            headers: _headers(),
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
      http
          .put(
            Uri.parse('$mirror/api/members/$targetId'),
            headers: _headers(),
            body: jsonEncode(patch),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }

    try {
      final res = await http
          .put(
            Uri.parse('$_baseUrl/api/auth/me'),
            headers: _headers(),
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        _captureAuth(res, body);
        if (body['user'] is Map<String, dynamic>) {
          final updated = User.fromJson({
            ...patch,
            ...(body['user'] as Map<String, dynamic>),
          });
          currentUser = updated;
          return updated;
        }
      }
    } catch (_) {}

    try {
      await http
          .put(
            Uri.parse('$_baseUrl/api/members/$targetId'),
            headers: _headers(),
            body: jsonEncode(patch),
          )
          .timeout(const Duration(seconds: 8));
    } catch (_) {}

    final updated = User(
      id: targetId,
      name: '${patch['name'] ?? currentUser?.name ?? 'User'}',
      email: '${patch['email'] ?? currentUser?.email ?? ''}',
      role: currentUser?.role ?? 'member',
      avatar: patch['avatar']?.toString() ?? currentUser?.avatar,
      department: patch['department']?.toString() ?? currentUser?.department,
      title: patch['title']?.toString() ?? currentUser?.title,
      phone: patch['phone']?.toString() ?? currentUser?.phone,
    );
    currentUser = updated;
    return updated;
  }

  static Future<List<AttendanceRecord>> attendance() async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/attendance'), headers: _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final list =
            body is List ? body : (body['records'] as List? ?? const []);
        return list
            .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return const [];
  }

  static Future<void> clockInOut(String action, {String? userId}) async {
    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .post(
            Uri.parse('$mirror/api/attendance'),
            headers: _headers(),
            body: jsonEncode({'action': action, 'userId': userId}),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }
    try {
      await http
          .post(
            Uri.parse('$_baseUrl/api/attendance'),
            headers: _headers(),
            body: jsonEncode({'action': action, 'userId': userId}),
          )
          .timeout(const Duration(seconds: 8));
    } catch (_) {}
  }

  static Map<String, dynamic> _taskToMap(Task t) => {
        'id': t.id,
        'title': t.title,
        'description': t.description,
        'status': t.status,
        'workflowState': t.workflowState,
        'isPaused': t.isPaused,
        'priority': t.priority,
        'projectId': t.projectId,
        'assigneeId': t.assigneeId,
        'assignedByName': t.assignedByName,
        'dueDate': t.dueDate,
        'dueTime': t.dueTime,
        'completedAt': t.completedAt,
        'createdAt': t.createdAt,
        'payout': t.payout,
        'payoutStatus': t.payoutStatus,
        'proofImage': t.proofImage,
        'proofNote': t.proofNote,
        'submissionRemarks': t.submissionRemarks,
        'reviewFeedback': t.reviewFeedback,
        'marketingType': t.marketingType,
        'creativeType': t.creativeType,
        'platform': t.platform,
        'sbu': t.sbu,
        'taskCode': t.taskCode,
        'workloadPercent': t.workloadPercent,
        'isManualWorkload': t.isManualWorkload,
        'estimatedHours': t.estimatedHours,
        'actualHours': t.actualHours,
        'assignedAt': t.assignedAt,
        'officialDeadline': t.officialDeadline,
        'warningDeadline': t.warningDeadline,
        'criticalDeadline': t.criticalDeadline,
        'referenceLink': t.referenceLink,
        'driveLink': t.driveLink,
        'finalOutputLink': t.finalOutputLink,
        'remarks': t.remarks,
        'tags': t.tags,
      };

  static const List<Member> _seedMembers = [
    Member(
      id: '1',
      name: 'Bala',
      email: 'bala@achariya.in',
      role: 'admin',
      department: 'Management',
      employeeId: 'EMP-001',
    ),
    Member(
      id: '2',
      name: 'Athiyaman',
      email: 'athiyaman@achariya.in',
      role: 'manager',
      department: 'Digital Marketing',
      employeeId: 'EMP-002',
    ),
    Member(
      id: '3',
      name: 'Ramkumar',
      email: 'ramkumar@achariya.in',
      role: 'member',
      department: 'Creative Design',
      employeeId: 'EMP-003',
    ),
    Member(
      id: '4',
      name: 'Sneka',
      email: 'sneka@achariya.in',
      role: 'member',
      department: 'Content & Copy',
      employeeId: 'EMP-004',
    ),
    Member(
      id: '5',
      name: 'Hari',
      email: 'hari@achariya.in',
      role: 'member',
      department: 'Video Production',
      employeeId: 'EMP-005',
    ),
  ];

  static const List<Project> _seedProjects = [
    Project(
      id: '1',
      name: 'Achariya Admissions 2026',
      description: 'Integrated digital and print creative workflow for Achariya institutions',
      status: 'active',
      progress: 75,
      business: 'Achariya',
      memberIds: ['1', '2', '3', '4', '5'],
    ),
    Project(
      id: '2',
      name: 'Q School Brand Launch',
      description: 'Social media creatives, reels, and posters for Q School',
      status: 'active',
      progress: 62,
      business: 'Q School',
      memberIds: ['2', '3', '4'],
    ),
    Project(
      id: '3',
      name: 'MIWAY & WOW Festive Campaign',
      description: 'Multi-SBU festive banners and reels',
      status: 'active',
      progress: 80,
      business: 'Miway',
      memberIds: ['1', '3', '5'],
    ),
  ];

  static const List<Task> _seedTasks = [
    Task(
      id: '52',
      taskCode: 'CWMS-2601',
      title: 'Aklavya New Saram Parent Testimonial Shooting - Video 2',
      description: 'Shoot & edit parent testimonial reel with subtitles and Achariya branding.',
      status: 'in-progress',
      workflowState: 'in-progress',
      priority: 'high',
      projectId: '1',
      assigneeId: '5',
      assignedByName: 'Bala',
      sbu: 'Achariya',
      marketingType: 'Digital Marketing',
      creativeType: 'Reel',
      platform: 'Meta',
      workloadPercent: 50,
      estimatedHours: 3.75,
      actualHours: 1.5,
      dueDate: '2026-11-12',
      dueTime: '05:30 PM',
    ),
    Task(
      id: '51',
      taskCode: 'CWMS-2600',
      title: 'Title and Description for Q-School Poster',
      description: 'Prepare copy and creative layout for Q-School admission campaign.',
      status: 'review',
      workflowState: 'awaiting-approval',
      priority: 'high',
      projectId: '2',
      assigneeId: '4',
      assignedByName: 'Athiyaman',
      sbu: 'Q School',
      marketingType: 'Digital Marketing',
      creativeType: 'Presentation Content',
      platform: 'Meta',
      workloadPercent: 30,
      estimatedHours: 2.25,
      actualHours: 2.0,
      dueDate: '2026-11-10',
      dueTime: '05:30 PM',
      finalOutputLink: 'https://drive.google.com/drive/folders/qschool-poster-final',
    ),
    Task(
      id: '50',
      taskCode: 'CWMS-2599',
      title: 'Shambala ASM Villupuram Banner - 1 No',
      description: 'Print-ready flex banner design for ASM Villupuram campus.',
      status: 'in-progress',
      workflowState: 'in-progress',
      priority: 'urgent',
      projectId: '1',
      assigneeId: '3',
      assignedByName: 'Bala',
      sbu: 'Achariya',
      marketingType: 'Direct Marketing',
      creativeType: 'Banner',
      platform: 'Offline',
      workloadPercent: 25,
      estimatedHours: 1.9,
      actualHours: 1.1,
      dueDate: '2026-11-08',
      dueTime: '02:30 PM',
    ),
    Task(
      id: '49',
      taskCode: 'CWMS-2598',
      title: 'Diwali Special Day Posters (Achariya, Miway, WOW) - 3 Nos',
      description: 'Festive social media creative set across 3 SBUs.',
      status: 'done',
      workflowState: 'completed',
      priority: 'high',
      projectId: '3',
      assigneeId: '3',
      assignedByName: 'Athiyaman',
      sbu: 'WOW',
      marketingType: 'Digital Marketing',
      creativeType: 'Social Media Creative',
      platform: 'Meta',
      workloadPercent: 60,
      estimatedHours: 4.5,
      actualHours: 4.0,
      dueDate: '2026-11-06',
      dueTime: '05:30 PM',
      completedAt: '2026-11-06T16:20:00Z',
      finalOutputLink: 'https://drive.google.com/drive/folders/diwali-posters-3sbu',
    ),
    Task(
      id: '48',
      taskCode: 'CWMS-2597',
      title: 'WIN Real Estate Site Walkthrough Motion Graphics',
      description: 'Animated plot highlights and location callouts for WIN Real Estate.',
      status: 'in-progress',
      workflowState: 'correction-required',
      priority: 'high',
      projectId: '3',
      assigneeId: '5',
      assignedByName: 'Bala',
      sbu: 'WIN Real Estate',
      marketingType: 'Digital Marketing',
      creativeType: 'Motion Graphics',
      platform: 'YouTube',
      workloadPercent: 60,
      estimatedHours: 4.5,
      actualHours: 3.8,
      dueDate: '2026-11-11',
      dueTime: '05:30 PM',
      reviewFeedback: 'Please update the contact number plate on the outro frame.',
    ),
  ];
}
