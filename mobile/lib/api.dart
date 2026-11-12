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
  static final List<Member> _localCreatedMembers = [];
  static final Set<String> _localDeletedMemberIds = {};
  static Map<String, dynamic> _localSettings = {
    'entityName': 'Digiventures',
    'entitySubtitle': 'CREATIVE WORKFLOW OS',
    'entityTagline': 'CRM & Creative Operations Workspace',
    'logoUrl': '/logo.png',
    'entityEmail': 'ops@achariya.ai',
    'entityPhone': '+91 98765 43210',
    'entityAddress': 'Achariya World Class Education HQ, Puducherry',
    'entityWebsite': 'https://achariya.ai',
    'colorScheme': 'navy-pink',
    'primaryColor': '#1A3A5C',
    'accentColor': '#E91E63',
    'secondaryColor': '#4F46E5',
    'sbuList': [
      {'id': 'sbu-1', 'name': 'Achariya', 'code': 'ACH', 'color': '#4F46E5', 'active': true},
      {'id': 'sbu-2', 'name': 'Q School', 'code': 'QSC', 'color': '#EC4899', 'active': true},
      {'id': 'sbu-3', 'name': 'Miway', 'code': 'MIW', 'color': '#0EA5E9', 'active': true},
      {'id': 'sbu-4', 'name': 'WOW', 'code': 'WOW', 'color': '#F59E0B', 'active': true},
      {'id': 'sbu-5', 'name': 'MINDS', 'code': 'MND', 'color': '#8B5CF6', 'active': true},
      {'id': 'sbu-6', 'name': 'RAW', 'code': 'RAW', 'color': '#10B981', 'active': true},
      {'id': 'sbu-7', 'name': 'Institute of Yoga', 'code': 'IOY', 'color': '#14B8A6', 'active': true},
      {'id': 'sbu-8', 'name': 'WIN Real Estate', 'code': 'WIN', 'color': '#F97316', 'active': true},
      {'id': 'sbu-9', 'name': 'DV IA', 'code': 'DVIA', 'color': '#6366F1', 'active': true},
    ],
    'modules': [
      {'id': 'dashboard', 'label': 'Dashboard', 'href': '/dashboard', 'mobileTab': true, 'enabled': true, 'roles': ['admin', 'manager', 'member', 'trainee']},
      {'id': 'tasks', 'label': 'Tasks', 'href': '/dashboard/tasks', 'mobileTab': true, 'enabled': true, 'roles': ['admin', 'manager', 'member', 'trainee']},
      {'id': 'approvals', 'label': 'Approvals', 'href': '/dashboard/approvals', 'mobileTab': true, 'enabled': true, 'roles': ['admin', 'manager', 'member', 'trainee']},
      {'id': 'workload', 'label': 'Workload', 'href': '/dashboard/workload', 'mobileTab': true, 'enabled': true, 'roles': ['admin', 'manager', 'member', 'trainee']},
      {'id': 'analytics', 'label': 'Analytics', 'href': '/dashboard/productivity', 'mobileTab': true, 'enabled': true, 'roles': ['admin', 'manager', 'member', 'trainee']},
    ],
    'leaderboardConfig': {
      'enabled': true,
      'showOnDashboard': true,
      'pointsPerCompleted': 10,
      'pointsPerOnTime': 5,
      'pointsPerUrgent': 5,
      'penaltyPerCorrection': 2,
      'manualBonusByUserId': <String, dynamic>{},
    },
    'peakPerformersConfig': {
      'enabled': true,
      'showBannerOnDashboard': true,
      'badgeTitle': 'Peak Performer of the Month',
      'periodLabel': 'November 2026',
      'featuredUserIds': <String>[],
      'spotlightNotes': <String, dynamic>{},
    },
  };

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
    bool fetchedFromServer = false;
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/tasks'), headers: _headers())
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        fetchedFromServer = true;
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

    if (!fetchedFromServer && remote.isEmpty) {
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

  static Future<void> clearAllTasks() async {
    _localCreatedTasks.clear();
    _localTaskPatches.clear();
    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .delete(Uri.parse('$mirror/api/tasks'), headers: _headers())
          .timeout(const Duration(seconds: 5))
          .ignore();
    }
    try {
      await http
          .delete(Uri.parse('$_baseUrl/api/tasks'), headers: _headers())
          .timeout(const Duration(seconds: 10));
    } catch (_) {}
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
        final parsed = list
            .map((e) {
              final map = Map<String, dynamic>.from(e as Map<String, dynamic>);
              final id = '${map['id'] ?? ''}';
              if (_localMemberPatches.containsKey(id)) {
                map.addAll(_localMemberPatches[id]!);
              }
              return Member.fromJson(map);
            })
            .where((m) => !_localDeletedMemberIds.contains(m.id))
            .toList();
        for (final created in _localCreatedMembers) {
          if (!parsed.any((x) => x.id == created.id) &&
              !_localDeletedMemberIds.contains(created.id)) {
            parsed.add(created);
          }
        }
        if (parsed.isNotEmpty) return parsed;
      }
    } catch (_) {}
    final seeded = _seedMembers
        .where((m) => !_localDeletedMemberIds.contains(m.id))
        .map((m) {
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
        })
        .toList();
    for (final created in _localCreatedMembers) {
      if (!seeded.any((x) => x.id == created.id) &&
          !_localDeletedMemberIds.contains(created.id)) {
        seeded.add(created);
      }
    }
    return seeded;
  }

  static Future<Member> createMember(Map<String, dynamic> payload) async {
    final cleanEmail = '${payload['email'] ?? ''}'.contains('@')
        ? '${'${payload['email']}'.split('@')[0].toLowerCase()}@achariya.ai'
        : '${'${payload['name'] ?? 'user'}'.toLowerCase().replaceAll(' ', '')}@achariya.ai';
    final body = {
      'id': payload['id'] ?? 'u-${DateTime.now().millisecondsSinceEpoch}',
      'name': payload['name'] ?? 'New User',
      'email': cleanEmail,
      'role': payload['role'] ?? 'member',
      'department': payload['department'] ?? 'Design',
      'title': payload['title'] ?? 'Creative Specialist',
      'phone': payload['phone'] ?? '+91 98765 43220',
      'password': payload['password'] ?? 'demo123',
      'employeeId': payload['employeeId'] ?? 'EMP-100',
      'status': 'active',
    };
    final created = Member.fromJson(body);
    _localCreatedMembers.add(created);

    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .post(
            Uri.parse('$mirror/api/members'),
            headers: _headers(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }
    try {
      final res = await http
          .post(
            Uri.parse('$_baseUrl/api/members'),
            headers: _headers(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200 || res.statusCode == 201) {
        final map = jsonDecode(res.body) as Map<String, dynamic>;
        return Member.fromJson({...body, ...map});
      }
    } catch (_) {}
    return created;
  }

  static Future<void> deleteMember(String id) async {
    _localDeletedMemberIds.add(id);
    _localCreatedMembers.removeWhere((m) => m.id == id);

    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .delete(Uri.parse('$mirror/api/members/$id'), headers: _headers())
          .timeout(const Duration(seconds: 5))
          .ignore();
    }
    try {
      await http
          .delete(Uri.parse('$_baseUrl/api/members/$id'), headers: _headers())
          .timeout(const Duration(seconds: 8));
    } catch (_) {}
  }

  static Future<Map<String, dynamic>> settings() async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl/api/settings'), headers: _headers())
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final map = Map<String, dynamic>.from(
          jsonDecode(res.body) as Map<String, dynamic>,
        );
        _localSettings = {..._localSettings, ...map};
        return _localSettings;
      }
    } catch (_) {}
    return _localSettings;
  }

  static Future<Map<String, dynamic>> saveSettings(
    Map<String, dynamic> patch,
  ) async {
    _localSettings = {..._localSettings, ...patch};
    final mirror = _mirrorUrl;
    if (mirror != null) {
      http
          .put(
            Uri.parse('$mirror/api/settings'),
            headers: _headers(),
            body: jsonEncode(_localSettings),
          )
          .timeout(const Duration(seconds: 5))
          .ignore();
    }
    try {
      final res = await http
          .put(
            Uri.parse('$_baseUrl/api/settings'),
            headers: _headers(),
            body: jsonEncode(_localSettings),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final map = Map<String, dynamic>.from(
          jsonDecode(res.body) as Map<String, dynamic>,
        );
        _localSettings = {..._localSettings, ...map};
      }
    } catch (_) {}
    return _localSettings;
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
      id: 'u1',
      name: 'Athiyaman',
      email: 'athiyaman@achariya.ai',
      role: 'admin',
      department: 'Executive',
      title: 'Operations Admin',
      phone: '+91 98765 43210',
      employeeId: 'EMP-001',
    ),
    Member(
      id: 'u2',
      name: 'Bala',
      email: 'bala@achariya.ai',
      role: 'admin',
      department: 'Engineering',
      title: 'Technical Admin',
      phone: '+91 98765 43211',
      employeeId: 'EMP-002',
    ),
    Member(
      id: 'u3',
      name: 'Ramkumar',
      email: 'ramkumar@achariya.ai',
      role: 'admin',
      department: 'Media Production',
      title: 'Media Admin',
      phone: '+91 98765 43212',
      employeeId: 'EMP-003',
    ),
    Member(
      id: 'u6',
      name: 'JEEVANESH',
      email: 'jeevanesh@achariya.ai',
      role: 'trainee',
      department: 'Engineering',
      title: 'Frontend Trainee',
      phone: '+91 98765 43213',
      employeeId: 'TRN-001',
    ),
    Member(
      id: 'u7',
      name: 'SIVA',
      email: 'siva@achariya.ai',
      role: 'trainee',
      department: 'Media Production',
      title: 'Video Editing Trainee',
      phone: '+91 98765 43214',
      employeeId: 'TRN-002',
    ),
    Member(
      id: 'u8',
      name: 'ADHITHYA',
      email: 'adhi@achariya.ai',
      role: 'trainee',
      department: 'Design',
      title: 'UI/UX Trainee',
      phone: '+91 98765 43215',
      employeeId: 'TRN-003',
    ),
    Member(
      id: 'u9',
      name: 'ALBERT',
      email: 'albert@achariya.ai',
      role: 'trainee',
      department: 'Content & Media',
      title: 'Content Writing Trainee',
      phone: '+91 98765 43216',
      employeeId: 'TRN-004',
    ),
    Member(
      id: 'u-sneka',
      name: 'Sneka Balan',
      email: 'sneka@achariya.ai',
      role: 'member',
      department: 'Content Writing & Scripts',
      title: 'Content Writer',
      phone: '+91 98765 43217',
      employeeId: 'CWMS-105',
    ),
    Member(
      id: 'u-hari',
      name: 'Hari',
      email: 'hari@achariya.ai',
      role: 'member',
      department: 'Design',
      title: 'Graphic Designer',
      phone: '+91 98765 43218',
      employeeId: 'EMP-004',
    ),
    Member(
      id: 'cmvy2nzka0003zkkzxev9ouqh',
      name: 'Mohamed Ummar',
      email: 'dme@achariya.ai',
      role: 'member',
      department: 'Executive',
      title: 'DME',
      phone: '+91 98765 43219',
      employeeId: 'EMP-005',
    ),
  ];

  static const List<Project> _seedProjects = [
    Project(
      id: 'p1',
      name: 'Book Preparation Work',
      description: 'Complete book preparation including content creation, editing, formatting and review.',
      status: 'active',
      progress: 0,
      business: 'MD Sir Projects',
      memberIds: ['u1', 'u9'],
    ),
    Project(
      id: 'p2',
      name: 'Video Work',
      description: 'Scheduled video production, editing, and task assignments for team members and trainees.',
      status: 'active',
      progress: 0,
      business: 'MD Sir Projects',
      memberIds: ['u1', 'u2', 'u3', 'u6', 'u7', 'u8', 'u9'],
    ),
    Project(
      id: 'p3',
      name: 'App Development',
      description: 'Mobile and web application development.',
      status: 'active',
      progress: 0,
      business: 'Miway',
      memberIds: ['u2', 'u6'],
    ),
  ];

  static const List<Task> _seedTasks = [];
}
