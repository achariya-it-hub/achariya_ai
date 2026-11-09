import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'theme.dart';
import 'widgets.dart';

Future<void> showNewTaskSheet({
  required BuildContext context,
  required User currentUser,
  required List<Member> members,
  required List<Project> projects,
  required VoidCallback onCreated,
  String? preselectedAssigneeId,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _NewTaskSheet(
      currentUser: currentUser,
      members: members,
      projects: projects,
      onCreated: onCreated,
      preselectedAssigneeId: preselectedAssigneeId,
    ),
  );
}

class _NewTaskSheet extends StatefulWidget {
  final User currentUser;
  final List<Member> members;
  final List<Project> projects;
  final VoidCallback onCreated;
  final String? preselectedAssigneeId;

  const _NewTaskSheet({
    required this.currentUser,
    required this.members,
    required this.projects,
    required this.onCreated,
    this.preselectedAssigneeId,
  });

  @override
  State<_NewTaskSheet> createState() => _NewTaskSheetState();
}

class _NewTaskSheetState extends State<_NewTaskSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _refLinkCtrl = TextEditingController();
  final _driveLinkCtrl = TextEditingController();
  final _remarksCtrl = TextEditingController();
  final _payoutCtrl = TextEditingController(text: '0');

  late String _assigneeId;
  String _sbu = kSbuOptions.first;
  String _marketingType = kMarketingTypes.first;
  String _creativeType = kCreativeTypes.first.name;
  String _platform = kPlatformOptions.first;
  String _priority = 'high';
  DateTime _dueDate = DateTime.now().add(const Duration(days: 1));
  String _dueTime = '05:30 PM';
  bool _manualWorkload = false;
  int _workloadPercent = 50;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _assigneeId = widget.preselectedAssigneeId ??
        (widget.members.isNotEmpty ? widget.members.first.id : widget.currentUser.id);
    _syncCreativeWorkload(_creativeType);
  }

  void _syncCreativeWorkload(String ctName) {
    if (_manualWorkload) return;
    for (final c in kCreativeTypes) {
      if (c.name == ctName) {
        _workloadPercent = c.defaultWorkloadPercent;
        return;
      }
    }
  }

  Member? get _selectedMember {
    final m = widget.members.where((e) => e.id == _assigneeId).toList();
    return m.isEmpty ? null : m.first;
  }

  double get _estimatedHours => (_workloadPercent / 100.0) * 7.5;

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a task name.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final projectId = widget.projects.isNotEmpty ? widget.projects.first.id : '1';
      final isTrainee = _selectedMember?.isTrainee ?? false;
      final dateStr =
          '${_dueDate.year}-${_dueDate.month.toString().padLeft(2, '0')}-${_dueDate.day.toString().padLeft(2, '0')}';

      await Api.createTask({
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'status': 'in-progress',
        'workflowState': 'assigned',
        'priority': _priority,
        'projectId': projectId,
        'assigneeId': _assigneeId,
        'assignedByName': widget.currentUser.name,
        'sbu': _sbu,
        'marketingType': _marketingType,
        'creativeType': _creativeType,
        'platform': _platform,
        'dueDate': dateStr,
        'dueTime': _dueTime,
        'workloadPercent': _workloadPercent,
        'isManualWorkload': _manualWorkload,
        'estimatedHours': double.parse(_estimatedHours.toStringAsFixed(2)),
        'referenceLink': _refLinkCtrl.text.trim(),
        'driveLink': _driveLinkCtrl.text.trim(),
        'remarks': _remarksCtrl.text.trim(),
        'payout': isTrainee ? (double.tryParse(_payoutCtrl.text) ?? 0) : 0,
      });
      if (mounted) {
        Navigator.pop(context);
        widget.onCreated();
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final estMins = (_estimatedHours * 60).round();
    final isTrainee = _selectedMember?.isTrainee ?? false;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      maxChildSize: 0.96,
      minChildSize: 0.65,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF8FAFC),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 16, 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1A3A5C), Color(0xFF1F3E68), Color(0xFF2B2A5A)],
                ),
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.add_task_rounded,
                          color: Color(0xFFF472B6),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'New Creative Task',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              'Assign a task with SBU, workload & SLA deadlines',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Body
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.all(18),
                children: [
                  _sectionCard(
                    title: 'Task Brief & Assignment',
                    icon: Icons.assignment_outlined,
                    children: [
                      _fieldLabel('Task Name *'),
                      TextField(
                        controller: _titleCtrl,
                        decoration: fieldDecoration(
                          'e.g. Achariya Gurugram Scholarship Test Shoot',
                          icon: Icons.title,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _fieldLabel('Description'),
                      TextField(
                        controller: _descCtrl,
                        maxLines: 2,
                        decoration: fieldDecoration(
                          'Creative brief, dimensions, deliverables...',
                          icon: Icons.notes_outlined,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Assigned To *'),
                                _dropdownBox<String>(
                                  value: _assigneeId,
                                  items: widget.members
                                      .map(
                                        (m) => DropdownMenuItem(
                                          value: m.id,
                                          child: Text(m.name),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) => setState(
                                    () => _assigneeId = v ?? _assigneeId,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('SBU (Business) *'),
                                _dropdownBox<String>(
                                  value: _sbu,
                                  items: kSbuOptions
                                      .map(
                                        (s) => DropdownMenuItem(
                                          value: s,
                                          child: Text(s),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) =>
                                      setState(() => _sbu = v ?? _sbu),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Marketing Type *'),
                                _dropdownBox<String>(
                                  value: _marketingType,
                                  items: kMarketingTypes
                                      .map(
                                        (m) => DropdownMenuItem(
                                          value: m,
                                          child: Text(m),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) => setState(
                                    () => _marketingType = v ?? _marketingType,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Creative Type *'),
                                _dropdownBox<String>(
                                  value: _creativeType,
                                  items: kCreativeTypes
                                      .map(
                                        (c) => DropdownMenuItem(
                                          value: c.name,
                                          child: Text(c.name),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) {
                                    if (v == null) return;
                                    setState(() {
                                      _creativeType = v;
                                      _syncCreativeWorkload(v);
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Platform *'),
                                _dropdownBox<String>(
                                  value: _platform,
                                  items: kPlatformOptions
                                      .map(
                                        (p) => DropdownMenuItem(
                                          value: p,
                                          child: Text(p),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) => setState(
                                    () => _platform = v ?? _platform,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Priority'),
                                _dropdownBox<String>(
                                  value: _priority,
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'low',
                                      child: Text('Low'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'medium',
                                      child: Text('Medium'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'high',
                                      child: Text('High'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'urgent',
                                      child: Text('Critical'),
                                    ),
                                  ],
                                  onChanged: (v) => setState(
                                    () => _priority = v ?? _priority,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Creative Workload Estimate Box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFEEF2FF), Color(0xFFFDF2F8)],
                      ),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.speed, size: 18, color: kIndigo),
                                SizedBox(width: 6),
                                Text(
                                  'CREATIVE WORKLOAD ESTIMATE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: kIndigo,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () => setState(
                                () => _manualWorkload = !_manualWorkload,
                              ),
                              child: Text(
                                _manualWorkload ? 'Reset to Auto' : 'Manual Override',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: kPink,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '$_creativeType: $_workloadPercent% of daily workload (~${formatMinutesReadable(estMins)} of 7.5h office day)',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: kSlate900,
                          ),
                        ),
                        if (_manualWorkload) ...[
                          Slider(
                            value: _workloadPercent.toDouble(),
                            min: 10,
                            max: 100,
                            divisions: 18,
                            activeColor: kIndigo,
                            label: '$_workloadPercent%',
                            onChanged: (v) =>
                                setState(() => _workloadPercent = v.round()),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Deadlines & Links
                  _sectionCard(
                    title: 'Schedule, SLA Deadlines & Links',
                    icon: Icons.event_available_outlined,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Est. Completion Date *'),
                                InkWell(
                                  onTap: () async {
                                    final picked = await showDatePicker(
                                      context: context,
                                      initialDate: _dueDate,
                                      firstDate: DateTime(2025),
                                      lastDate: DateTime(2028),
                                    );
                                    if (picked != null) {
                                      setState(() => _dueDate = picked);
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: kSlate100.withValues(alpha: 0.7),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: kSlate200),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.calendar_today,
                                          size: 16,
                                          color: kSlate500,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '${_dueDate.day.toString().padLeft(2, '0')}-${_dueDate.month.toString().padLeft(2, '0')}-${_dueDate.year}',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: kSlate900,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('Est. Completion Time *'),
                                _dropdownBox<String>(
                                  value: _dueTime,
                                  items: const [
                                    DropdownMenuItem(
                                      value: '12:30 PM',
                                      child: Text('12:30 PM'),
                                    ),
                                    DropdownMenuItem(
                                      value: '02:30 PM',
                                      child: Text('02:30 PM'),
                                    ),
                                    DropdownMenuItem(
                                      value: '05:30 PM',
                                      child: Text('05:30 PM'),
                                    ),
                                    DropdownMenuItem(
                                      value: '07:00 PM',
                                      child: Text('07:00 PM'),
                                    ),
                                  ],
                                  onChanged: (v) => setState(
                                    () => _dueTime = v ?? _dueTime,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _fieldLabel('Reference Link'),
                      TextField(
                        controller: _refLinkCtrl,
                        decoration: fieldDecoration(
                          'https://...',
                          icon: Icons.link,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _fieldLabel('Google Drive Link'),
                      TextField(
                        controller: _driveLinkCtrl,
                        decoration: fieldDecoration(
                          'https://drive.google.com/...',
                          icon: Icons.folder_open_outlined,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _fieldLabel('Remarks'),
                      TextField(
                        controller: _remarksCtrl,
                        decoration: fieldDecoration(
                          'Additional instructions...',
                          icon: Icons.chat_bubble_outline,
                        ),
                      ),
                      if (isTrainee) ...[
                        const SizedBox(height: 12),
                        _fieldLabel('Trainee Task Payout (₹)'),
                        TextField(
                          controller: _payoutCtrl,
                          keyboardType: TextInputType.number,
                          decoration: fieldDecoration(
                            '0',
                            icon: Icons.currency_rupee,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 20),
                  GradientButton(
                    label: 'Create & Assign Task',
                    icon: Icons.check_circle_outline,
                    loading: _saving,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 17, color: kIndigo),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: kSlate900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _fieldLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 5),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: kSlate700,
          ),
        ),
      );

  Widget _dropdownBox<T>({
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: kSlate100.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kSlate200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: kSlate900,
          ),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// Full Task Detail & Approval Workflow Sheet matching `/dashboard/tasks/[id]`
Future<void> showTaskDetailSheet({
  required BuildContext context,
  required Task task,
  required User currentUser,
  required List<Member> members,
  required List<Project> projects,
  required VoidCallback onUpdated,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _TaskDetailSheet(
      task: task,
      currentUser: currentUser,
      members: members,
      projects: projects,
      onUpdated: onUpdated,
    ),
  );
}

class _TaskDetailSheet extends StatefulWidget {
  final Task task;
  final User currentUser;
  final List<Member> members;
  final List<Project> projects;
  final VoidCallback onUpdated;

  const _TaskDetailSheet({
    required this.task,
    required this.currentUser,
    required this.members,
    required this.projects,
    required this.onUpdated,
  });

  @override
  State<_TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<_TaskDetailSheet> {
  late String _stage;
  late String _priority;
  late String? _assigneeId;
  late String _finalOutputLink;
  final _commentCtrl = TextEditingController();
  final List<Map<String, String>> _comments = [];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _stage = widget.task.stage;
    _priority = widget.task.priority;
    _assigneeId = widget.task.assigneeId;
    _finalOutputLink = widget.task.finalOutputLink ?? widget.task.driveLink ?? '';
    if (widget.task.reviewFeedback != null &&
        widget.task.reviewFeedback!.isNotEmpty) {
      _comments.add({
        'author': 'Reviewer',
        'text': widget.task.reviewFeedback!,
        'time': 'Review note',
      });
    }
    if (widget.task.submissionRemarks != null &&
        widget.task.submissionRemarks!.isNotEmpty) {
      _comments.add({
        'author': _assigneeName,
        'text': widget.task.submissionRemarks!,
        'time': 'Submission note',
      });
    }
  }

  String get _assigneeName {
    final m = widget.members.where((e) => e.id == _assigneeId).toList();
    return m.isEmpty ? 'Unassigned' : m.first.name;
  }

  String _stageToBaseStatus(String stage) {
    switch (stage) {
      case 'created':
      case 'assigned':
        return 'todo';
      case 'accepted':
      case 'in-progress':
      case 'correction-required':
        return 'in-progress';
      case 'in-review':
      case 'awaiting-approval':
      case 'correction-submitted':
        return 'review';
      case 'approved':
      case 'completed':
        return 'done';
      default:
        return 'in-progress';
    }
  }

  Future<void> _applyPatch(Map<String, dynamic> patch) async {
    setState(() => _busy = true);
    try {
      await Api.updateTask(widget.task.id, patch);
      widget.onUpdated();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeStage(String nextStage, {String? finalLink, String? note}) async {
    final baseStatus = _stageToBaseStatus(nextStage);
    setState(() {
      _stage = nextStage;
      if (finalLink != null && finalLink.isNotEmpty) {
        _finalOutputLink = finalLink;
      }
    });
    await _applyPatch({
      'workflowState': nextStage,
      'status': baseStatus,
      if (finalLink != null && finalLink.isNotEmpty) 'finalOutputLink': finalLink,
      if (note != null && note.isNotEmpty) 'submissionRemarks': note,
      if (nextStage == 'completed' || nextStage == 'approved')
        'completedAt': DateTime.now().toIso8601String(),
    });
  }

  void _openSubmitForApprovalDialog() {
    final linkCtrl = TextEditingController(text: _finalOutputLink);
    final noteCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (dCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text(
          'Submit for Approval',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Paste the final Google Drive deliverable link. It will be stored permanently for the reviewer.',
              style: TextStyle(fontSize: 12, color: kSlate600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: linkCtrl,
              decoration: fieldDecoration(
                'https://drive.google.com/...',
                icon: Icons.add_link,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: noteCtrl,
              maxLines: 2,
              decoration: fieldDecoration(
                'Optional submission notes...',
                icon: Icons.notes,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dCtx),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: kIndigo),
            onPressed: () {
              final link = linkCtrl.text.trim();
              if (link.isEmpty) return;
              Navigator.pop(dCtx);
              _changeStage(
                'awaiting-approval',
                finalLink: link,
                note: noteCtrl.text.trim(),
              );
            },
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Submit Deliverable'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final sbu = t.resolvedSbu(widget.projects);
    final estStr = formatMinutesReadable(t.resolvedEstimatedMinutes);
    final actStr = formatMinutesReadable(t.resolvedActualMinutes);

    return DraggableScrollableSheet(
      initialChildSize: 0.90,
      maxChildSize: 0.96,
      minChildSize: 0.60,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF8FAFC),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // Top Navy Banner
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 16, 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1A3A5C), Color(0xFF1F3E68), Color(0xFF2B2A5A)],
                ),
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          t.displayCode,
                          style: const TextStyle(
                            color: Color(0xFFA5B4FC),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      StageBadge(stage: _stage),
                      const SizedBox(width: 6),
                      PriorityBadge(priority: _priority),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Assigned by ${t.assignedByName ?? 'Admin'}  •  SBU: $sbu',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),

            if (_busy) const LinearProgressIndicator(minHeight: 2),

            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.all(16),
                children: [
                  // Final Output Deliverable Banner
                  if (_finalOutputLink.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                size: 16,
                                color: Color(0xFF059669),
                              ),
                              SizedBox(width: 6),
                              Text(
                                'Final Output Submitted',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF065F46),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _finalOutputLink,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF047857),
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Workflow Action Bar
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: kSlate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.autorenew,
                              size: 16,
                              color: kIndigo,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Workflow — ${getStageInfo(_stage).label}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: kSlate900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (_stage == 'created' || _stage == 'assigned')
                              FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: kIndigo,
                                ),
                                onPressed: () => _changeStage('accepted'),
                                icon: const Icon(Icons.thumb_up_alt_outlined, size: 15),
                                label: const Text('Accept Task'),
                              ),
                            if (_stage == 'accepted' ||
                                _stage == 'assigned' ||
                                _stage == 'correction-required')
                              FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                ),
                                onPressed: () => _changeStage('in-progress'),
                                icon: const Icon(Icons.play_arrow_rounded, size: 16),
                                label: const Text('Start Work'),
                              ),
                            if (_stage != 'completed' && _stage != 'approved')
                              FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF059669),
                                ),
                                onPressed: _openSubmitForApprovalDialog,
                                icon: const Icon(Icons.check_circle_outline, size: 15),
                                label: const Text('Submit for Approval'),
                              ),
                            if (widget.currentUser.isElevated &&
                                (_stage == 'awaiting-approval' ||
                                    _stage == 'in-review' ||
                                    _stage == 'correction-submitted')) ...[
                              FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF16A34A),
                                ),
                                onPressed: () => _changeStage('completed'),
                                icon: const Icon(Icons.verified_outlined, size: 15),
                                label: const Text('Approve & Complete'),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => _changeStage('correction-required'),
                                icon: const Icon(Icons.replay, size: 15),
                                label: const Text('Return for Correction'),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 10),
                        // Direct 11-stage switcher
                        Row(
                          children: [
                            const Text(
                              'Stage:',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: kSlate600,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _stage,
                                  isExpanded: true,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: kSlate900,
                                  ),
                                  items: kTaskStages
                                      .map(
                                        (s) => DropdownMenuItem(
                                          value: s.value,
                                          child: Text(s.label),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) {
                                    if (v != null) _changeStage(v);
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Details Matrix
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: kSlate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Task Details & SLA',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: kSlate900,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _detailRow('Assignee', _assigneeName),
                        _detailRow('Assigned By', t.assignedByName ?? 'Admin'),
                        _detailRow('SBU (Business)', sbu),
                        _detailRow('Creative Type', t.resolvedCreativeType),
                        _detailRow('Platform', t.resolvedPlatform),
                        _detailRow('Marketing Type', t.marketingType ?? 'Digital Marketing'),
                        _detailRow(
                          'Official Deadline',
                          '${t.dueDate ?? 'Nov 2026'} · ${t.dueTime ?? '05:30 PM'}',
                        ),
                        _detailRow('Escalation', t.escalationLevel),
                        _detailRow('Execution / Est. Time', '$actStr / $estStr'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Comments section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: kSlate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Comments & Review Notes',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: kSlate900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _commentCtrl,
                                decoration: fieldDecoration(
                                  'Write a comment...',
                                  icon: Icons.chat_bubble_outline,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filled(
                              style: IconButton.styleFrom(backgroundColor: kIndigo),
                              onPressed: () {
                                final txt = _commentCtrl.text.trim();
                                if (txt.isEmpty) return;
                                setState(() {
                                  _comments.insert(0, {
                                    'author': widget.currentUser.name,
                                    'text': txt,
                                    'time': 'Just now',
                                  });
                                  _commentCtrl.clear();
                                });
                                _applyPatch({'remarks': txt});
                              },
                              icon: const Icon(Icons.send_rounded, size: 18),
                            ),
                          ],
                        ),
                        if (_comments.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          ..._comments.map(
                            (c) => Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: kSlate100.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        c['author'] ?? '',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: kSlate900,
                                        ),
                                      ),
                                      Text(
                                        c['time'] ?? '',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: kSlate500,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    c['text'] ?? '',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: kSlate700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: kSlate500,
              fontWeight: FontWeight.w600,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12.5,
                color: kSlate900,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
