import 'package:flutter/material.dart';

const List<String> kSbuOptions = [
  'Achariya',
  'AGOC',
  'Miway',
  'Q School',
  'WIN Real Estate',
  'WOW',
];

const List<String> kPlatformOptions = [
  'Meta',
  'Google',
  'Website',
  'Offline',
  'YouTube',
  'LinkedIn',
  'WhatsApp',
];

const List<String> kMarketingTypes = [
  'Digital Marketing',
  'Direct Marketing',
];

class CreativeTypeInfo {
  final String name;
  final int defaultWorkloadPercent;
  final double defaultHours;

  const CreativeTypeInfo(this.name, this.defaultWorkloadPercent, this.defaultHours);
}

const List<CreativeTypeInfo> kCreativeTypes = [
  CreativeTypeInfo('Reel', 50, 3.75),
  CreativeTypeInfo('Full Day Shooting', 100, 7.5),
  CreativeTypeInfo('Half Day Shooting', 50, 3.75),
  CreativeTypeInfo('Social Media Creative', 20, 1.5),
  CreativeTypeInfo('Carousel', 35, 2.6),
  CreativeTypeInfo('Banner', 25, 1.9),
  CreativeTypeInfo('Brochure', 60, 4.5),
  CreativeTypeInfo('Video Editing', 50, 3.75),
  CreativeTypeInfo('Motion Graphics', 60, 4.5),
  CreativeTypeInfo('Presentation Content', 30, 2.25),
  CreativeTypeInfo('Logo / Branding', 80, 6.0),
];

class TaskStageInfo {
  final String value;
  final String label;
  final Color bg;
  final Color fg;
  final Color dot;

  const TaskStageInfo({
    required this.value,
    required this.label,
    required this.bg,
    required this.fg,
    required this.dot,
  });
}

const List<TaskStageInfo> kTaskStages = [
  TaskStageInfo(
    value: 'created',
    label: 'Created',
    bg: Color(0xFFF1F5F9),
    fg: Color(0xFF334155),
    dot: Color(0xFF64748B),
  ),
  TaskStageInfo(
    value: 'assigned',
    label: 'Assigned',
    bg: Color(0xFFEFF6FF),
    fg: Color(0xFF1D4ED8),
    dot: Color(0xFF3B82F6),
  ),
  TaskStageInfo(
    value: 'accepted',
    label: 'Accepted',
    bg: Color(0xFFECFEFF),
    fg: Color(0xFF0E7490),
    dot: Color(0xFF06B6D4),
  ),
  TaskStageInfo(
    value: 'in-progress',
    label: 'In Progress',
    bg: Color(0xFFFEF3C7),
    fg: Color(0xFF92400E),
    dot: Color(0xFFF59E0B),
  ),
  TaskStageInfo(
    value: 'in-review',
    label: 'In Review',
    bg: Color(0xFFEEF2FF),
    fg: Color(0xFF4338CA),
    dot: Color(0xFF6366F1),
  ),
  TaskStageInfo(
    value: 'awaiting-approval',
    label: 'Awaiting Approval',
    bg: Color(0xFFDCFCE7),
    fg: Color(0xFF15803D),
    dot: Color(0xFF22C55E),
  ),
  TaskStageInfo(
    value: 'approved',
    label: 'Approved',
    bg: Color(0xFFD1FAE5),
    fg: Color(0xFF047857),
    dot: Color(0xFF10B981),
  ),
  TaskStageInfo(
    value: 'completed',
    label: 'Completed',
    bg: Color(0xFFDCFCE7),
    fg: Color(0xFF166534),
    dot: Color(0xFF16A34A),
  ),
  TaskStageInfo(
    value: 'correction-required',
    label: 'Correction Required',
    bg: Color(0xFFFFEDD5),
    fg: Color(0xFFC2410C),
    dot: Color(0xFFF97316),
  ),
  TaskStageInfo(
    value: 'correction-submitted',
    label: 'Correction Submitted',
    bg: Color(0xFFF3E8FF),
    fg: Color(0xFF7E22CE),
    dot: Color(0xFFA855F7),
  ),
  TaskStageInfo(
    value: 'cancelled',
    label: 'Cancelled',
    bg: Color(0xFFFFE4E6),
    fg: Color(0xFFBE123C),
    dot: Color(0xFFF43F5E),
  ),
];

TaskStageInfo getStageInfo(String stage) {
  for (final s in kTaskStages) {
    if (s.value == stage) return s;
  }
  return kTaskStages[3]; // default In Progress
}

String formatMinutesReadable(int totalMinutes) {
  final mins = totalMinutes < 0 ? 0 : totalMinutes;
  final h = mins ~/ 60;
  final m = mins % 60;
  if (h <= 0) return '${m}m';
  if (m == 0) return '${h}h';
  return '${h}h ${m}m';
}

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? avatar;
  final String? department;
  final String? title;
  final String? phone;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatar,
    this.department,
    this.title,
    this.phone,
  });

  bool get isElevated =>
      role.toLowerCase() == 'admin' || role.toLowerCase() == 'manager';

  bool get isTrainee => role.toLowerCase() == 'trainee';

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        role: '${j['role'] ?? 'member'}',
        avatar: j['avatar']?.toString(),
        department: j['department']?.toString(),
        title: j['title']?.toString(),
        phone: j['phone']?.toString(),
      );
}

class Member {
  final String id;
  final String name;
  final String email;
  final String role;
  final String department;
  final String? title;
  final String? phone;
  final String? avatar;
  final String? status;
  final String? employeeId;

  const Member({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.department,
    this.title,
    this.phone,
    this.avatar,
    this.status,
    this.employeeId,
  });

  bool get isTrainee => role.toLowerCase() == 'trainee';

  factory Member.fromJson(Map<String, dynamic> j) => Member(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        role: '${j['role'] ?? 'member'}',
        department: '${j['department'] ?? 'Creative'}',
        title: j['title']?.toString(),
        phone: j['phone']?.toString(),
        avatar: j['avatar']?.toString(),
        status: j['status']?.toString() ?? 'active',
        employeeId: j['employeeId']?.toString(),
      );
}

class Project {
  final String id;
  final String name;
  final String description;
  final String status;
  final double progress;
  final String? dueDate;
  final String? color;
  final String? business;
  final List<String> memberIds;

  const Project({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    required this.progress,
    this.dueDate,
    this.color,
    this.business,
    required this.memberIds,
  });

  factory Project.fromJson(Map<String, dynamic> j) => Project(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        description: '${j['description'] ?? ''}',
        status: '${j['status'] ?? 'active'}',
        progress: (j['progress'] as num?)?.toDouble() ?? 0,
        dueDate: j['dueDate']?.toString(),
        color: j['color']?.toString(),
        business: j['business']?.toString(),
        memberIds: (j['memberIds'] as List?)?.map((e) => '$e').toList() ?? const [],
      );
}

class Task {
  final String id;
  final String title;
  final String? description;
  final String status; // todo | in-progress | review | done
  final String? workflowState; // 11-stage workflow state
  final bool isPaused;
  final String priority; // low | medium | high | urgent
  final String projectId;
  final String? assigneeId;
  final String? assignedByName;
  final String? dueDate;
  final String? dueTime;
  final String? completedAt;
  final String? createdAt;
  final double payout;
  final String? payoutStatus;
  final String? proofImage;
  final String? proofNote;
  final String? submissionRemarks;
  final String? reviewFeedback;
  final String? marketingType;
  final String? creativeType;
  final String? platform;
  final String? sbu;
  final String? taskCode;
  final int? workloadPercent;
  final bool isManualWorkload;
  final double? estimatedHours;
  final double? actualHours;
  final String? assignedAt;
  final String? officialDeadline;
  final String? warningDeadline;
  final String? criticalDeadline;
  final String? referenceLink;
  final String? driveLink;
  final String? finalOutputLink;
  final String? remarks;
  final List<String> tags;

  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    this.workflowState,
    this.isPaused = false,
    required this.priority,
    required this.projectId,
    this.assigneeId,
    this.assignedByName,
    this.dueDate,
    this.dueTime,
    this.completedAt,
    this.createdAt,
    this.payout = 0,
    this.payoutStatus,
    this.proofImage,
    this.proofNote,
    this.submissionRemarks,
    this.reviewFeedback,
    this.marketingType,
    this.creativeType,
    this.platform,
    this.sbu,
    this.taskCode,
    this.workloadPercent,
    this.isManualWorkload = false,
    this.estimatedHours,
    this.actualHours,
    this.assignedAt,
    this.officialDeadline,
    this.warningDeadline,
    this.criticalDeadline,
    this.referenceLink,
    this.driveLink,
    this.finalOutputLink,
    this.remarks,
    this.tags = const [],
  });

  factory Task.fromJson(Map<String, dynamic> j) => Task(
        id: '${j['id'] ?? ''}',
        title: '${j['title'] ?? ''}',
        description: j['description']?.toString(),
        status: '${j['status'] ?? 'todo'}',
        workflowState: j['workflowState']?.toString(),
        isPaused: j['isPaused'] == true,
        priority: '${j['priority'] ?? 'medium'}',
        projectId: '${j['projectId'] ?? ''}',
        assigneeId: j['assigneeId']?.toString(),
        assignedByName: j['assignedByName']?.toString(),
        dueDate: j['dueDate']?.toString(),
        dueTime: j['dueTime']?.toString(),
        completedAt: j['completedAt']?.toString(),
        createdAt: j['createdAt']?.toString(),
        payout: (j['payout'] as num?)?.toDouble() ?? 0,
        payoutStatus: j['payoutStatus']?.toString(),
        proofImage: j['proofImage']?.toString(),
        proofNote: j['proofNote']?.toString(),
        submissionRemarks: j['submissionRemarks']?.toString(),
        reviewFeedback: j['reviewFeedback']?.toString(),
        marketingType: j['marketingType']?.toString(),
        creativeType: j['creativeType']?.toString(),
        platform: j['platform']?.toString(),
        sbu: j['sbu']?.toString(),
        taskCode: j['taskCode']?.toString(),
        workloadPercent: (j['workloadPercent'] as num?)?.toInt(),
        isManualWorkload: j['isManualWorkload'] == true,
        estimatedHours: (j['estimatedHours'] as num?)?.toDouble(),
        actualHours: (j['actualHours'] as num?)?.toDouble(),
        assignedAt: j['assignedAt']?.toString(),
        officialDeadline: j['officialDeadline']?.toString(),
        warningDeadline: j['warningDeadline']?.toString(),
        criticalDeadline: j['criticalDeadline']?.toString(),
        referenceLink: j['referenceLink']?.toString(),
        driveLink: j['driveLink']?.toString(),
        finalOutputLink: j['finalOutputLink']?.toString(),
        remarks: j['remarks']?.toString(),
        tags: (j['tags'] as List?)?.map((e) => '$e').toList() ?? const [],
      );

  /// Resolved 11-stage workflow stage matching `resolveTaskStage` in web `lib/task-workflow.ts`.
  String get stage {
    if (workflowState != null && workflowState!.isNotEmpty) {
      return workflowState!;
    }
    if (payoutStatus == 'changes_requested') {
      return 'correction-required';
    }
    switch (status) {
      case 'todo':
        return assigneeId != null && assigneeId!.isNotEmpty ? 'assigned' : 'created';
      case 'in-progress':
        return 'in-progress';
      case 'review':
        return 'awaiting-approval';
      case 'done':
        return 'completed';
      default:
        return 'in-progress';
    }
  }

  TaskStageInfo get stageInfo => getStageInfo(stage);

  bool get isCompleted =>
      status == 'done' || stage == 'completed' || stage == 'approved';

  bool get isInReview =>
      status == 'review' ||
      stage == 'in-review' ||
      stage == 'awaiting-approval' ||
      stage == 'correction-submitted';

  bool get isCorrection => stage == 'correction-required';

  bool get isOverdue {
    if (isCompleted || stage == 'cancelled') return false;
    if (dueDate == null || dueDate!.isEmpty) return false;
    final parsed = DateTime.tryParse(dueDate!);
    if (parsed == null) return false;
    final endOfDay = DateTime(parsed.year, parsed.month, parsed.day, 23, 59, 59);
    return endOfDay.isBefore(DateTime.now());
  }

  String get displayCode {
    if (taskCode != null && taskCode!.isNotEmpty) return taskCode!;
    final numeric = id.replaceAll(RegExp(r'[^0-9]'), '');
    final numVal = int.tryParse(numeric) ?? 1;
    return 'CWMS-${2550 + numVal}';
  }

  static String _normalizeSbu(String? raw) {
    if (raw == null || raw.trim().isEmpty) return '';
    final lower = raw.trim().toLowerCase();
    for (final opt in kSbuOptions) {
      if (lower == opt.toLowerCase() || lower.contains(opt.toLowerCase())) {
        return opt;
      }
    }
    if (lower.contains('real estate') || lower.contains('win')) {
      return 'WIN Real Estate';
    }
    if (lower.contains('q-school') || lower.contains('qschool')) {
      return 'Q School';
    }
    return '';
  }

  String resolvedSbu(List<Project> projects) {
    final fromTask = _normalizeSbu(sbu);
    if (fromTask.isNotEmpty) return fromTask;
    final p = projects.where((pr) => pr.id == projectId).toList();
    if (p.isNotEmpty) {
      final fromProjBiz = _normalizeSbu(p.first.business);
      if (fromProjBiz.isNotEmpty) return fromProjBiz;
      final fromProjName = _normalizeSbu(p.first.name);
      if (fromProjName.isNotEmpty) return fromProjName;
    }
    final fromTitle = _normalizeSbu(title);
    if (fromTitle.isNotEmpty) return fromTitle;
    return 'Achariya';
  }

  String get resolvedPlatform {
    if (platform != null && platform!.isNotEmpty) return platform!;
    final lower = '${title.toLowerCase()} ${tags.join(' ').toLowerCase()}';
    if (lower.contains('banner') ||
        lower.contains('poster') ||
        lower.contains('board') ||
        lower.contains('print')) {
      return 'Offline';
    }
    if (lower.contains('google') || lower.contains('search') || lower.contains('ad')) {
      return 'Google';
    }
    if (lower.contains('web') || lower.contains('landing')) {
      return 'Website';
    }
    return 'Meta';
  }

  String get resolvedCreativeType {
    if (creativeType != null && creativeType!.isNotEmpty) return creativeType!;
    final lower = title.toLowerCase();
    if (lower.contains('shoot')) return 'Half Day Shooting';
    if (lower.contains('reel') || lower.contains('video')) return 'Reel';
    if (lower.contains('banner') || lower.contains('board')) return 'Banner';
    if (lower.contains('brochure')) return 'Brochure';
    if (lower.contains('carousel')) return 'Carousel';
    return 'Social Media Creative';
  }

  int get resolvedEstimatedMinutes {
    if (estimatedHours != null && estimatedHours! > 0) {
      return (estimatedHours! * 60).round();
    }
    if (workloadPercent != null && workloadPercent! > 0) {
      return ((workloadPercent! / 100.0) * 450).round();
    }
    final ct = resolvedCreativeType;
    for (final item in kCreativeTypes) {
      if (item.name.toLowerCase() == ct.toLowerCase()) {
        return ((item.defaultWorkloadPercent / 100.0) * 450).round();
      }
    }
    return 150; // 2h 30m default
  }

  int get resolvedActualMinutes {
    if (actualHours != null && actualHours! > 0) {
      return (actualHours! * 60).round();
    }
    final est = resolvedEstimatedMinutes;
    if (isCompleted) return (est * 0.92).round();
    if (isInReview) return (est * 0.85).round();
    if (stage == 'in-progress') return (est * 0.45).round();
    return 15;
  }

  String get escalationLevel {
    if (isOverdue || priority == 'urgent') return 'Critical';
    if (priority == 'high') return 'Warning';
    return 'Normal';
  }
}

class AttendanceRecord {
  final String id;
  final String userId;
  final DateTime? clockInAt;
  final DateTime? clockOutAt;
  final String status;

  const AttendanceRecord({
    required this.id,
    required this.userId,
    this.clockInAt,
    this.clockOutAt,
    required this.status,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        id: '${j['id'] ?? ''}',
        userId: '${j['userId'] ?? ''}',
        clockInAt: j['clockIn'] != null
            ? DateTime.tryParse('${j['clockIn']}')
            : (j['clockInAt'] != null ? DateTime.tryParse('${j['clockInAt']}') : null),
        clockOutAt: j['clockOut'] != null
            ? DateTime.tryParse('${j['clockOut']}')
            : (j['clockOutAt'] != null ? DateTime.tryParse('${j['clockOutAt']}') : null),
        status: '${j['status'] ?? 'present'}',
      );
}
