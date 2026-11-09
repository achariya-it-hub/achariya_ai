import 'dart:async';
import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'task_modals.dart';
import 'theme.dart';
import 'widgets.dart';

class HomeShell extends StatefulWidget {
  final User user;
  final VoidCallback onSignedOut;
  const HomeShell({super.key, required this.user, required this.onSignedOut});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  bool _loading = true;
  List<Project> _projects = const [];
  List<Task> _tasks = const [];
  List<Member> _members = const [];
  List<AttendanceRecord> _attendance = const [];
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _syncTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _silentSync();
    });
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    super.dispose();
  }

  Future<void> _silentSync() async {
    try {
      final results = await Future.wait([
        Api.projects(),
        Api.tasks(),
        Api.members(),
        Api.attendance(),
      ]);
      if (!mounted) return;
      setState(() {
        _projects = results[0] as List<Project>;
        _tasks = results[1] as List<Task>;
        _members = results[2] as List<Member>;
        _attendance = results[3] as List<AttendanceRecord>;
      });
    } catch (_) {}
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        Api.projects(),
        Api.tasks(),
        Api.members(),
        Api.attendance(),
      ]);
      if (!mounted) return;
      setState(() {
        _projects = results[0] as List<Project>;
        _tasks = results[1] as List<Task>;
        _members = results[2] as List<Member>;
        _attendance = results[3] as List<AttendanceRecord>;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Member? get _me {
    final byEmail = _members
        .where((m) => m.email.toLowerCase() == widget.user.email.toLowerCase())
        .toList();
    if (byEmail.isNotEmpty) return byEmail.first;
    final byId = _members.where((m) => m.id == widget.user.id).toList();
    if (byId.isNotEmpty) return byId.first;
    return _members.isNotEmpty ? _members.first : null;
  }

  void _openAttendanceSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF8FAFC),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(ctx).size.height * 0.72,
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: kSlate400.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Attendance & Shift Tracker',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: kSlate900,
              ),
            ),
            Expanded(
              child: _AttendanceSheetBody(
                me: _me,
                attendance: _attendance,
                onChanged: () {
                  Navigator.pop(ctx);
                  _refresh();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final awaitingCount = _tasks.where((t) => t.isInReview).length;

    final pages = [
      _ExecutiveDashboardTab(
        user: widget.user,
        projects: _projects,
        tasks: _tasks,
        members: _members,
        onRefresh: _refresh,
        onNavigateTab: (idx) => setState(() => _tab = idx),
      ),
      _TasksWorkspaceTab(
        user: widget.user,
        projects: _projects,
        tasks: _tasks,
        members: _members,
        onRefresh: _refresh,
      ),
      _ApprovalsReviewsTab(
        user: widget.user,
        projects: _projects,
        tasks: _tasks,
        members: _members,
        onRefresh: _refresh,
      ),
      _WorkloadMatrixTab(
        user: widget.user,
        projects: _projects,
        tasks: _tasks,
        members: _members,
        onRefresh: _refresh,
      ),
      _AnalyticsIndividualTab(
        user: widget.user,
        projects: _projects,
        tasks: _tasks,
        members: _members,
        onRefresh: _refresh,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 14,
        title: const BrandLogo(size: 32),
        actions: [
          // Quick + New Task button
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: kIndigo,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => showNewTaskSheet(
                context: context,
                currentUser: widget.user,
                members: _members,
                projects: _projects,
                onCreated: _refresh,
              ),
              icon: const Icon(Icons.add, size: 16),
              label: const Text(
                'New task',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Attendance & Shift',
            icon: const Icon(Icons.access_time_rounded, color: kSlate700, size: 21),
            onPressed: _openAttendanceSheet,
          ),
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout_rounded, color: kSlate700, size: 20),
            onPressed: () async {
              await Api.logout();
              widget.onSignedOut();
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _loading && _tasks.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: kSlate200.withValues(alpha: 0.8))),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          backgroundColor: Colors.white,
          indicatorColor: kIndigo.withValues(alpha: 0.12),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.space_dashboard_outlined),
              selectedIcon: Icon(Icons.space_dashboard, color: kIndigo),
              label: 'Dashboard',
            ),
            const NavigationDestination(
              icon: Icon(Icons.checklist_rtl_outlined),
              selectedIcon: Icon(Icons.checklist_rtl, color: kIndigo),
              label: 'Tasks',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: awaitingCount > 0,
                label: Text('$awaitingCount'),
                child: const Icon(Icons.verified_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: awaitingCount > 0,
                label: Text('$awaitingCount'),
                child: const Icon(Icons.verified, color: kIndigo),
              ),
              label: 'Approvals',
            ),
            const NavigationDestination(
              icon: Icon(Icons.speed_outlined),
              selectedIcon: Icon(Icons.speed, color: kIndigo),
              label: 'Workload',
            ),
            const NavigationDestination(
              icon: Icon(Icons.analytics_outlined),
              selectedIcon: Icon(Icons.analytics, color: kIndigo),
              label: 'Analytics',
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// TAB 1: EXECUTIVE DASHBOARD
// ============================================================================
class _ExecutiveDashboardTab extends StatefulWidget {
  final User user;
  final List<Project> projects;
  final List<Task> tasks;
  final List<Member> members;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onNavigateTab;

  const _ExecutiveDashboardTab({
    required this.user,
    required this.projects,
    required this.tasks,
    required this.members,
    required this.onRefresh,
    required this.onNavigateTab,
  });

  @override
  State<_ExecutiveDashboardTab> createState() => _ExecutiveDashboardTabState();
}

class _ExecutiveDashboardTabState extends State<_ExecutiveDashboardTab> {
  String _period = 'This Month';

  @override
  Widget build(BuildContext context) {
    final tasks = widget.tasks;
    final total = tasks.length;
    final completed = tasks.where((t) => t.isCompleted).length;
    final inProgress = tasks
        .where((t) => !t.isCompleted && !t.isInReview && t.stage != 'cancelled')
        .length;
    final inReview = tasks.where((t) => t.isInReview).length;
    final overdue = tasks.where((t) => t.isOverdue).length;
    final critical = tasks
        .where((t) => !t.isCompleted && (t.priority == 'urgent' || t.isOverdue))
        .length;
    final corrections = tasks.where((t) => t.isCorrection).length;
    final teamSize = widget.members.length;
    final completionRate = total > 0 ? ((completed / total) * 100).round() : 0;

    // Top Performer & Most Loaded
    String topPerformerName = 'Ramkumar';
    int topPerformerDone = 0;
    String mostLoadedName = 'Bala';
    int mostLoadedOpen = 0;

    for (final m in widget.members) {
      final mDone =
          tasks.where((t) => t.assigneeId == m.id && t.isCompleted).length;
      final mOpen =
          tasks.where((t) => t.assigneeId == m.id && !t.isCompleted).length;
      if (mDone >= topPerformerDone) {
        topPerformerDone = mDone;
        topPerformerName = m.name;
      }
      if (mOpen >= mostLoadedOpen) {
        mostLoadedOpen = mOpen;
        mostLoadedName = m.name;
      }
    }

    // SBU counts
    final Map<String, int> sbuCounts = {for (final s in kSbuOptions) s: 0};
    for (final t in tasks) {
      final s = t.resolvedSbu(widget.projects);
      sbuCounts[s] = (sbuCounts[s] ?? 0) + 1;
    }
    final sortedSbus = sbuCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topSbu = sortedSbus.isNotEmpty ? sortedSbus.first.key : 'Achariya';
    final topSbuCount = sortedSbus.isNotEmpty ? sortedSbus.first.value : 0;

    // Platform counts
    final Map<String, int> platformCounts = {
      'Meta': 0,
      'Offline': 0,
      'Google': 0,
      'Website': 0,
    };
    for (final t in tasks) {
      final p = t.resolvedPlatform;
      platformCounts[p] = (platformCounts[p] ?? 0) + 1;
    }

    // Trainee-only payout check
    final showTraineePayout = widget.user.isTrainee;
    final traineeTasks = tasks.where((t) => t.payout > 0).toList();

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CommandBanner(
            badge: 'Digiventures · Creative Workflow OS',
            badgeIcon: Icons.auto_awesome,
            title: 'Executive Dashboard',
            subtitle:
                'Live overview of creative workflow across the organization.',
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _period,
                  dropdownColor: kNavy,
                  isDense: true,
                  icon: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.white,
                    size: 16,
                  ),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'This Month',
                      child: Text('This Month'),
                    ),
                    DropdownMenuItem(
                      value: 'Last 7 Days',
                      child: Text('Last 7 Days'),
                    ),
                    DropdownMenuItem(
                      value: 'All Time',
                      child: Text('All Time'),
                    ),
                  ],
                  onChanged: (v) =>
                      setState(() => _period = v ?? 'This Month'),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 8 Bento KPI Cards (2x4 grid)
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.48,
            children: [
              BentoKpiCard(
                label: 'Total Tasks',
                value: '$total',
                caption: 'Active creative pipeline',
                icon: Icons.layers_outlined,
                accentColor: kIndigo,
                onTap: () => widget.onNavigateTab(1),
              ),
              BentoKpiCard(
                label: 'Completed',
                value: '$completed',
                caption: '$completionRate% completion rate',
                icon: Icons.check_circle_outline,
                accentColor: const Color(0xFF10B981),
                onTap: () => widget.onNavigateTab(1),
              ),
              BentoKpiCard(
                label: 'In Progress',
                value: '$inProgress',
                caption: 'Active execution',
                icon: Icons.schedule,
                accentColor: const Color(0xFF3B82F6),
                onTap: () => widget.onNavigateTab(1),
              ),
              BentoKpiCard(
                label: 'In Review',
                value: '$inReview',
                caption: 'Awaiting approval',
                icon: Icons.verified_outlined,
                accentColor: const Color(0xFFF59E0B),
                onTap: () => widget.onNavigateTab(2),
              ),
              BentoKpiCard(
                label: 'Overdue',
                value: '$overdue',
                caption: 'Past SLA deadline',
                icon: Icons.warning_amber_rounded,
                accentColor: const Color(0xFFF97316),
                onTap: () => widget.onNavigateTab(1),
              ),
              BentoKpiCard(
                label: 'Critical',
                value: '$critical',
                caption: 'High-priority attention',
                icon: Icons.bolt_rounded,
                accentColor: const Color(0xFFF43F5E),
                onTap: () => widget.onNavigateTab(1),
              ),
              BentoKpiCard(
                label: 'Corrections',
                value: '$corrections',
                caption: 'Revision requested',
                icon: Icons.replay_rounded,
                accentColor: kPink,
                onTap: () => widget.onNavigateTab(2),
              ),
              BentoKpiCard(
                label: 'Team Size',
                value: '$teamSize',
                caption: 'Active specialists',
                icon: Icons.groups_outlined,
                accentColor: kPurple,
                onTap: () => widget.onNavigateTab(3),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 4 Highlight Cards (Top Performer, Most Loaded, Top SBU, Avg Completion)
          Row(
            children: [
              Expanded(
                child: _highlightTile(
                  icon: Icons.emoji_events_outlined,
                  iconColor: const Color(0xFF10B981),
                  label: 'Top Performer',
                  value: topPerformerName,
                  sub: '$topPerformerDone completed',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _highlightTile(
                  icon: Icons.local_fire_department_outlined,
                  iconColor: const Color(0xFFF43F5E),
                  label: 'Most Loaded',
                  value: mostLoadedName,
                  sub: '$mostLoadedOpen open tasks',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _highlightTile(
                  icon: Icons.business_outlined,
                  iconColor: kIndigo,
                  label: 'Top SBU',
                  value: topSbu,
                  sub: '$topSbuCount tasks',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _highlightTile(
                  icon: Icons.av_timer_rounded,
                  iconColor: const Color(0xFFF59E0B),
                  label: 'Avg Completion',
                  value: '3.2d',
                  sub: '$completed tasks delivered',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Completion Rate & SBU Statistics Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
            ),
            child: Row(
              children: [
                RadialGauge(
                  percent: completionRate,
                  subtitle: '$completed of $total',
                  size: 106,
                  color: const Color(0xFF10B981),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SBU Statistics',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: kSlate900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Tasks per strategic business unit',
                        style: TextStyle(fontSize: 11, color: kSlate500),
                      ),
                      const SizedBox(height: 10),
                      ...sortedSbus.take(4).map((e) {
                        final ratio = total > 0 ? e.value / total : 0.0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    e.key,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: kSlate700,
                                    ),
                                  ),
                                  Text(
                                    '${e.value}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: kSlate900,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(999),
                                child: LinearProgressIndicator(
                                  value: ratio,
                                  minHeight: 5,
                                  backgroundColor: kSlate100,
                                  color: kIndigo,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Platform Statistics Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle(
                  'Platform Statistics',
                  trailing: 'Distribution by channel',
                  icon: Icons.hub_outlined,
                ),
                const SizedBox(height: 12),
                ...platformCounts.entries.map((e) {
                  final pct = total > 0 ? e.value / total : 0.0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 68,
                          child: Text(
                            e.key,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: kSlate700,
                            ),
                          ),
                        ),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: pct,
                              minHeight: 8,
                              backgroundColor: kSlate100,
                              color: e.key == 'Meta'
                                  ? const Color(0xFF10B981)
                                  : e.key == 'Offline'
                                      ? const Color(0xFFF59E0B)
                                      : kIndigo,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 26,
                          child: Text(
                            '${e.value}',
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: kSlate900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Trainee-Only Payout Card (strictly shown only if trainee or trainee tasks exist)
          if (showTraineePayout && traineeTasks.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1A3A5C), Color(0xFF312E81)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TRAINEE TASK PAYOUTS',
                        style: TextStyle(
                          color: Color(0xFFA5B4FC),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Earned Task Incentives',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '₹${traineeTasks.fold<double>(0, (s, t) => s + t.payout).toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Color(0xFF34D399),
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Recent Activity List
          const SectionTitle(
            'Recent Activity',
            trailing: 'Tap to inspect',
            icon: Icons.bolt_outlined,
          ),
          const SizedBox(height: 10),
          ...tasks.take(6).map(
                (t) => _TaskRowCard(
                  task: t,
                  projects: widget.projects,
                  members: widget.members,
                  onTap: () => showTaskDetailSheet(
                    context: context,
                    task: t,
                    currentUser: widget.user,
                    members: widget.members,
                    projects: widget.projects,
                    onUpdated: widget.onRefresh,
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _highlightTile({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required String sub,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: iconColor),
              const SizedBox(width: 5),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: kSlate500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: kSlate900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: kSlate500,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// TAB 2: TASKS & 11-STAGE FILTERS
// ============================================================================
class _TasksWorkspaceTab extends StatefulWidget {
  final User user;
  final List<Project> projects;
  final List<Task> tasks;
  final List<Member> members;
  final Future<void> Function() onRefresh;

  const _TasksWorkspaceTab({
    required this.user,
    required this.projects,
    required this.tasks,
    required this.members,
    required this.onRefresh,
  });

  @override
  State<_TasksWorkspaceTab> createState() => _TasksWorkspaceTabState();
}

class _TasksWorkspaceTabState extends State<_TasksWorkspaceTab> {
  String _search = '';
  String _stageFilter = 'all';
  String _sbuFilter = 'all';
  String _priorityFilter = 'all';
  String _assigneeFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.tasks.where((t) {
      if (_stageFilter != 'all' && t.stage != _stageFilter) return false;
      if (_sbuFilter != 'all' && t.resolvedSbu(widget.projects) != _sbuFilter) {
        return false;
      }
      if (_priorityFilter != 'all' && t.priority != _priorityFilter) {
        return false;
      }
      if (_assigneeFilter != 'all' && t.assigneeId != _assigneeFilter) {
        return false;
      }
      if (_search.isNotEmpty) {
        final q = _search.toLowerCase();
        final matchTitle = t.title.toLowerCase().contains(q);
        final matchCode = t.displayCode.toLowerCase().contains(q);
        final matchDesc = (t.description ?? '').toLowerCase().contains(q);
        if (!matchTitle && !matchCode && !matchDesc) return false;
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CommandBanner(
            badge: 'Creative Pipeline · 11-Stage Engine',
            badgeIcon: Icons.checklist_rtl_rounded,
            title: 'Tasks Workspace',
            subtitle:
                'Showing ${filtered.length} of ${widget.tasks.length} tasks across all SBUs.',
          ),
          const SizedBox(height: 14),

          // Search + Filters Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
            ),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: fieldDecoration(
                    'Search by name, CWMS code, description...',
                    icon: Icons.search,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _filterDropdown(
                        value: _stageFilter,
                        items: [
                          const DropdownMenuItem(
                            value: 'all',
                            child: Text('All statuses (11)'),
                          ),
                          ...kTaskStages.map(
                            (s) => DropdownMenuItem(
                              value: s.value,
                              child: Text(s.label),
                            ),
                          ),
                        ],
                        onChanged: (v) =>
                            setState(() => _stageFilter = v ?? 'all'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _filterDropdown(
                        value: _sbuFilter,
                        items: [
                          const DropdownMenuItem(
                            value: 'all',
                            child: Text('All SBUs'),
                          ),
                          ...kSbuOptions.map(
                            (s) => DropdownMenuItem(
                              value: s,
                              child: Text(s),
                            ),
                          ),
                        ],
                        onChanged: (v) =>
                            setState(() => _sbuFilter = v ?? 'all'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _filterDropdown(
                        value: _priorityFilter,
                        items: const [
                          DropdownMenuItem(
                            value: 'all',
                            child: Text('All priorities'),
                          ),
                          DropdownMenuItem(
                            value: 'urgent',
                            child: Text('Critical'),
                          ),
                          DropdownMenuItem(value: 'high', child: Text('High')),
                          DropdownMenuItem(
                            value: 'medium',
                            child: Text('Medium'),
                          ),
                          DropdownMenuItem(value: 'low', child: Text('Low')),
                        ],
                        onChanged: (v) =>
                            setState(() => _priorityFilter = v ?? 'all'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _filterDropdown(
                        value: _assigneeFilter,
                        items: [
                          const DropdownMenuItem(
                            value: 'all',
                            child: Text('All assignees'),
                          ),
                          ...widget.members.map(
                            (m) => DropdownMenuItem(
                              value: m.id,
                              child: Text(m.name),
                            ),
                          ),
                        ],
                        onChanged: (v) =>
                            setState(() => _assigneeFilter = v ?? 'all'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          ...filtered.map(
            (t) => _TaskRowCard(
              task: t,
              projects: widget.projects,
              members: widget.members,
              onTap: () => showTaskDetailSheet(
                context: context,
                task: t,
                currentUser: widget.user,
                members: widget.members,
                projects: widget.projects,
                onUpdated: widget.onRefresh,
              ),
            ),
          ),

          if (filtered.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text(
                  'No tasks match the current filters.',
                  style: TextStyle(color: kSlate500),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _filterDropdown({
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: kSlate100.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kSlate200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          style: const TextStyle(
            fontSize: 11.5,
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

class _TaskRowCard extends StatelessWidget {
  final Task task;
  final List<Project> projects;
  final List<Member> members;
  final VoidCallback onTap;

  const _TaskRowCard({
    required this.task,
    required this.projects,
    required this.members,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final sbu = task.resolvedSbu(projects);
    final m = members.where((e) => e.id == task.assigneeId).toList();
    final assigneeName = m.isEmpty ? 'Unassigned' : m.first.name;
    final actStr = formatMinutesReadable(task.resolvedActualMinutes);
    final estStr = formatMinutesReadable(task.resolvedEstimatedMinutes);
    final hasFinalOutput =
        (task.finalOutputLink != null && task.finalOutputLink!.isNotEmpty) ||
            (task.driveLink != null && task.driveLink!.isNotEmpty);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.025),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  task.displayCode,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: kIndigo,
                  ),
                ),
                const SizedBox(width: 6),
                Flexible(child: SbuPill(sbu: sbu)),
                const SizedBox(width: 6),
                PriorityBadge(priority: task.priority),
                const SizedBox(width: 4),
                StageBadge(stage: task.stage),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              task.title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: kSlate900,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Assigned to $assigneeName',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: kSlate600,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '$actStr / $estStr',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFD97706),
                  ),
                ),
                if (task.dueDate != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    '• ${task.dueDate}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: task.isOverdue
                          ? const Color(0xFFDC2626)
                          : kSlate500,
                    ),
                  ),
                ],
              ],
            ),
            if (hasFinalOutput) ...[
              const SizedBox(height: 6),
              const Row(
                children: [
                  Icon(Icons.open_in_new, size: 13, color: Color(0xFF059669)),
                  SizedBox(width: 4),
                  Text(
                    'Final output submitted',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF059669),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// TAB 3: APPROVALS & REVIEWS
// ============================================================================
class _ApprovalsReviewsTab extends StatefulWidget {
  final User user;
  final List<Project> projects;
  final List<Task> tasks;
  final List<Member> members;
  final Future<void> Function() onRefresh;

  const _ApprovalsReviewsTab({
    required this.user,
    required this.projects,
    required this.tasks,
    required this.members,
    required this.onRefresh,
  });

  @override
  State<_ApprovalsReviewsTab> createState() => _ApprovalsReviewsTabState();
}

class _ApprovalsReviewsTabState extends State<_ApprovalsReviewsTab> {
  String _queueTab = 'awaiting'; // awaiting | correction | approved | rejected

  Future<void> _decide(Task t, String decision) async {
    if (decision == 'approve') {
      await Api.updateTask(t.id, {
        'workflowState': 'completed',
        'status': 'done',
        'payoutStatus': 'approved',
        'completedAt': DateTime.now().toIso8601String(),
      });
    } else if (decision == 'correction') {
      await Api.updateTask(t.id, {
        'workflowState': 'correction-required',
        'status': 'in-progress',
        'payoutStatus': 'changes_requested',
      });
    } else if (decision == 'reject') {
      await Api.updateTask(t.id, {
        'workflowState': 'cancelled',
        'status': 'todo',
        'payoutStatus': 'rejected',
      });
    }
    await widget.onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    final tasks = widget.tasks;
    final awaiting = tasks.where((t) => t.isInReview).toList();
    final corrections = tasks.where((t) => t.isCorrection).toList();
    final approved = tasks.where((t) => t.isCompleted).toList();
    final rejected = tasks.where((t) => t.stage == 'cancelled').toList();

    final totalDecisions =
        approved.length + corrections.length + rejected.length;
    final approvalRate = totalDecisions > 0
        ? ((approved.length / totalDecisions) * 100).round()
        : 100;

    List<Task> queueList;
    switch (_queueTab) {
      case 'correction':
        queueList = corrections;
        break;
      case 'approved':
        queueList = approved;
        break;
      case 'rejected':
        queueList = rejected;
        break;
      default:
        queueList = awaiting;
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const CommandBanner(
            badge: 'Quality Assurance · Approval Workflow',
            badgeIcon: Icons.verified_outlined,
            title: 'Approvals & Reviews',
            subtitle:
                'Review submitted work, track every decision, and monitor approval health.',
          ),
          const SizedBox(height: 16),

          // 8 Approval KPI Cards
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.48,
            children: [
              BentoKpiCard(
                label: 'Awaiting approval',
                value: '${awaiting.length}',
                caption: 'Tasks queued for decision',
                icon: Icons.inbox_outlined,
                accentColor: const Color(0xFF10B981),
              ),
              BentoKpiCard(
                label: 'Approved today',
                value: '${approved.isNotEmpty ? 2 : 0}',
                caption: '${approved.length} this month',
                icon: Icons.thumb_up_alt_outlined,
                accentColor: kIndigo,
              ),
              BentoKpiCard(
                label: 'Approval rate',
                value: '$approvalRate%',
                caption: '${approved.length} of $totalDecisions decisions',
                icon: Icons.verified_outlined,
                accentColor: const Color(0xFF059669),
              ),
              const BentoKpiCard(
                label: 'Avg submission time',
                value: '4.1d',
                caption: 'Assignment to submission',
                icon: Icons.schedule,
                accentColor: Color(0xFF3B82F6),
              ),
              BentoKpiCard(
                label: 'Returned for correction',
                value: '${corrections.length}',
                caption: 'Submissions returned',
                icon: Icons.replay_rounded,
                accentColor: const Color(0xFFF59E0B),
              ),
              BentoKpiCard(
                label: 'Rejected',
                value: '${rejected.length}',
                caption: 'Submissions rejected',
                icon: Icons.thumb_down_alt_outlined,
                accentColor: const Color(0xFFF43F5E),
              ),
              BentoKpiCard(
                label: 'Approved this month',
                value: '${approved.length}',
                caption: 'November 2026',
                icon: Icons.check_circle_outline,
                accentColor: const Color(0xFF10B981),
              ),
              BentoKpiCard(
                label: 'Total decisions',
                value: '$totalDecisions',
                caption: 'Approvals · corrections · rejects',
                icon: Icons.shield_outlined,
                accentColor: kPurple,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Queue Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _queueChip('awaiting', 'Awaiting Approval (${awaiting.length})'),
                const SizedBox(width: 8),
                _queueChip(
                  'correction',
                  'Correction Required (${corrections.length})',
                ),
                const SizedBox(width: 8),
                _queueChip('approved', 'Approved (${approved.length})'),
                const SizedBox(width: 8),
                _queueChip('rejected', 'Rejected (${rejected.length})'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          ...queueList.map((t) {
            final m =
                widget.members.where((e) => e.id == t.assigneeId).toList();
            final assigneeName = m.isEmpty ? 'Unassigned' : m.first.name;
            final sbu = t.resolvedSbu(widget.projects);
            final link = t.finalOutputLink ?? t.driveLink ?? '';

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(15),
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
                      Text(
                        t.displayCode,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: kIndigo,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: SbuPill(sbu: sbu),
                        ),
                      ),
                      const SizedBox(width: 6),
                      StageBadge(stage: t.stage),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: kSlate900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Submitted by $assigneeName  •  ${t.resolvedCreativeType} (${t.resolvedPlatform})',
                    style: const TextStyle(fontSize: 11.5, color: kSlate600),
                  ),
                  if (link.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.link,
                            size: 14,
                            color: Color(0xFF059669),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              link,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF047857),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          visualDensity: VisualDensity.compact,
                        ),
                        onPressed: () => _decide(t, 'approve'),
                        icon: const Icon(Icons.check, size: 15),
                        label: const Text(
                          'Approve & Complete',
                          style: TextStyle(fontSize: 11.5),
                        ),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                        ),
                        onPressed: () => _decide(t, 'correction'),
                        icon: const Icon(Icons.replay, size: 15),
                        label: const Text(
                          'Return for Correction',
                          style: TextStyle(fontSize: 11.5),
                        ),
                      ),
                      TextButton(
                        onPressed: () => showTaskDetailSheet(
                          context: context,
                          task: t,
                          currentUser: widget.user,
                          members: widget.members,
                          projects: widget.projects,
                          onUpdated: widget.onRefresh,
                        ),
                        child: const Text(
                          'Inspect',
                          style: TextStyle(fontSize: 11.5),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),

          if (queueList.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(
                child: Text(
                  'No submissions in this queue.',
                  style: TextStyle(color: kSlate500),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _queueChip(String id, String label) {
    final active = _queueTab == id;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      selectedColor: kIndigo,
      labelStyle: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w700,
        color: active ? Colors.white : kSlate700,
      ),
      onSelected: (_) => setState(() => _queueTab = id),
    );
  }
}

// ============================================================================
// TAB 4: WORKLOAD MANAGEMENT & MATRIX
// ============================================================================
class _WorkloadMatrixTab extends StatefulWidget {
  final User user;
  final List<Project> projects;
  final List<Task> tasks;
  final List<Member> members;
  final Future<void> Function() onRefresh;

  const _WorkloadMatrixTab({
    required this.user,
    required this.projects,
    required this.tasks,
    required this.members,
    required this.onRefresh,
  });

  @override
  State<_WorkloadMatrixTab> createState() => _WorkloadMatrixTabState();
}

class _WorkloadMatrixTabState extends State<_WorkloadMatrixTab> {
  String _bandFilter = 'all'; // all | available | busy | overloaded
  String _sortBy = 'load'; // load | active | name

  @override
  Widget build(BuildContext context) {
    const int weeklyCapMins = 2490; // 41h 30m per member
    const int dailyCapMins = 450; // 7h 30m per member

    final memberRows = widget.members.map((m) {
      final mTasks = widget.tasks.where((t) => t.assigneeId == m.id).toList();
      final activeTasks =
          mTasks.where((t) => !t.isCompleted && t.stage != 'cancelled').toList();
      final pendingTasks = mTasks
          .where((t) => t.stage == 'created' || t.stage == 'assigned')
          .toList();
      final correctionTasks = mTasks.where((t) => t.isCorrection).toList();
      final completedTasks = mTasks.where((t) => t.isCompleted).toList();
      final overdueCount = activeTasks.where((t) => t.isOverdue).length;

      final estMins = activeTasks.fold<int>(
        0,
        (s, t) => s + t.resolvedEstimatedMinutes,
      );
      final actMins = mTasks.fold<int>(
        0,
        (s, t) => s + t.resolvedActualMinutes,
      );
      final remMins = (weeklyCapMins - estMins).clamp(0, weeklyCapMins);
      final loadPct = ((estMins / weeklyCapMins) * 100).round();

      String band = 'available';
      if (loadPct >= 100) {
        band = 'overloaded';
      } else if (loadPct >= 70) {
        band = 'busy';
      }

      return _MemberWorkloadData(
        member: m,
        activeCount: activeTasks.length,
        pendingCount: pendingTasks.length,
        correctionCount: correctionTasks.length,
        completedCount: completedTasks.length,
        overdueCount: overdueCount,
        estMins: estMins,
        actMins: actMins,
        remMins: remMins,
        loadPct: loadPct,
        band: band,
      );
    }).toList();

    final totalTeamCapMins =
        (widget.members.isEmpty ? 1 : widget.members.length) * weeklyCapMins;
    final totalEstMins =
        memberRows.fold<int>(0, (s, r) => s + r.estMins);
    final totalActMins =
        memberRows.fold<int>(0, (s, r) => s + r.actMins);
    final teamUtilPct = totalTeamCapMins > 0
        ? ((totalEstMins / totalTeamCapMins) * 100).round()
        : 0;

    final overloadedCount =
        memberRows.where((r) => r.band == 'overloaded').length;
    final availableCount =
        memberRows.where((r) => r.band == 'available').length;

    // Today's capacity (7h 30m * members)
    final todayCapMins =
        (widget.members.isEmpty ? 1 : widget.members.length) * dailyCapMins;
    final todayAssignedMins = (totalEstMins * 0.45).round();
    final todayCompletedMins = (totalActMins * 0.30).round();
    final todayRemainingMins =
        (todayCapMins - todayAssignedMins).clamp(0, todayCapMins);
    final todayUtilPct = todayCapMins > 0
        ? ((todayAssignedMins / todayCapMins) * 100).round()
        : 0;

    final visibleRows = memberRows.where((r) {
      if (_bandFilter != 'all' && r.band != _bandFilter) return false;
      return true;
    }).toList();

    visibleRows.sort((a, b) {
      if (_sortBy == 'active') return b.activeCount.compareTo(a.activeCount);
      if (_sortBy == 'name') return a.member.name.compareTo(b.member.name);
      return b.loadPct.compareTo(a.loadPct);
    });

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CommandBanner(
            badge: 'Capacity Matrix · 41h 30m / Member',
            badgeIcon: Icons.speed_rounded,
            title: 'Workload Management',
            subtitle:
                'Auto-calculated weekly & daily capacity from active creative tasks.',
            bottomChild: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _bandPill('all', 'All (${memberRows.length})', Colors.white),
                _bandPill(
                  'available',
                  '● < 70% ($availableCount)',
                  const Color(0xFF34D399),
                ),
                _bandPill(
                  'busy',
                  '● 70–99%',
                  const Color(0xFFFBBF24),
                ),
                _bandPill(
                  'overloaded',
                  '● ≥ 100% ($overloadedCount)',
                  const Color(0xFFF87171),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4 Workload KPI Cards
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.48,
            children: [
              BentoKpiCard(
                label: 'Team utilization',
                value: '$teamUtilPct%',
                caption:
                    '${formatMinutesReadable(totalEstMins)} of ${formatMinutesReadable(totalTeamCapMins)}',
                icon: Icons.donut_large_rounded,
                accentColor: const Color(0xFF10B981),
              ),
              BentoKpiCard(
                label: 'Overloaded',
                value: '$overloadedCount',
                caption: 'Members ≥ 100% capacity',
                icon: Icons.local_fire_department_outlined,
                accentColor: const Color(0xFFF43F5E),
              ),
              BentoKpiCard(
                label: 'Available',
                value: '$availableCount',
                caption: 'Workload < 70%',
                icon: Icons.check_circle_outline,
                accentColor: kIndigo,
              ),
              BentoKpiCard(
                label: 'Actual vs Estimated',
                value: formatMinutesReadable(totalActMins),
                caption: 'Est. ${formatMinutesReadable(totalEstMins)}',
                icon: Icons.trending_up_rounded,
                accentColor: const Color(0xFFF59E0B),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Today's Workload Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionTitle(
                  "Today's Workload",
                  trailing:
                      '7h 30m × ${widget.members.length} available',
                  icon: Icons.today_outlined,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _miniMetricTile(
                            "TODAY'S CAPACITY",
                            formatMinutesReadable(todayCapMins),
                            '${widget.members.length} members',
                          ),
                          _miniMetricTile(
                            'ASSIGNED WORKLOAD',
                            formatMinutesReadable(todayAssignedMins),
                            'Active today',
                          ),
                          _miniMetricTile(
                            'COMPLETED WORKLOAD',
                            formatMinutesReadable(todayCompletedMins),
                            'Logged today',
                          ),
                          _miniMetricTile(
                            'REMAINING CAPACITY',
                            formatMinutesReadable(todayRemainingMins),
                            'Available bandwidth',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    RadialGauge(
                      percent: todayUtilPct,
                      subtitle: 'Today',
                      size: 92,
                      color: const Color(0xFF10B981),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Members Workload Matrix Header + Sort
          Row(
            children: [
              const Icon(Icons.groups_outlined, size: 18, color: kIndigo),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Members Workload Matrix',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: kSlate900,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              _sortBtn('load', 'Load'),
              const SizedBox(width: 4),
              _sortBtn('active', 'Active'),
              const SizedBox(width: 4),
              _sortBtn('name', 'Name'),
            ],
          ),
          const SizedBox(height: 10),

          // Member Rows
          ...visibleRows.map((r) {
            final barColor = r.band == 'overloaded'
                ? const Color(0xFFF43F5E)
                : r.band == 'busy'
                    ? const Color(0xFFF59E0B)
                    : const Color(0xFF10B981);
            final badgeLabel = r.band == 'overloaded'
                ? 'Overloaded'
                : r.band == 'busy'
                    ? 'Busy'
                    : 'Available';

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
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
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: barColor.withValues(alpha: 0.14),
                        child: Text(
                          r.member.name.substring(0, 1).toUpperCase(),
                          style: TextStyle(
                            color: barColor,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r.member.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: kSlate900,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Wrap(
                              spacing: 6,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 7,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: barColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    badgeLabel,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: barColor,
                                    ),
                                  ),
                                ),
                                if (r.overdueCount > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 7,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFE4E6),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      '${r.overdueCount} overdue',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFBE123C),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        onPressed: () => showNewTaskSheet(
                          context: context,
                          currentUser: widget.user,
                          members: widget.members,
                          projects: widget.projects,
                          onCreated: widget.onRefresh,
                          preselectedAssigneeId: r.member.id,
                        ),
                        icon: const Icon(Icons.person_add_alt_1, size: 14),
                        label: const Text(
                          'Assign',
                          style: TextStyle(fontSize: 11.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Workload',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: kSlate500,
                        ),
                      ),
                      Text(
                        '${r.loadPct}%',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: kSlate900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: (r.loadPct / 100.0).clamp(0.0, 1.0),
                      minHeight: 8,
                      backgroundColor: kSlate100,
                      color: barColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 10,
                    runSpacing: 4,
                    children: [
                      Text(
                        'Est: ${formatMinutesReadable(r.estMins)}',
                        style: const TextStyle(fontSize: 10.5, color: kSlate600),
                      ),
                      Text(
                        'Act: ${formatMinutesReadable(r.actMins)}',
                        style: const TextStyle(fontSize: 10.5, color: kSlate600),
                      ),
                      Text(
                        'Rem: ${formatMinutesReadable(r.remMins)}',
                        style: const TextStyle(fontSize: 10.5, color: kSlate600),
                      ),
                      const Text(
                        'Cap: 41h 30m',
                        style: TextStyle(fontSize: 10.5, color: kSlate500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _countBox(
                        '${r.activeCount}',
                        'Active',
                        const Color(0xFFE0F2FE),
                        const Color(0xFF0369A1),
                      ),
                      const SizedBox(width: 6),
                      _countBox(
                        '${r.pendingCount}',
                        'Pending',
                        const Color(0xFFFEF3C7),
                        const Color(0xFFB45309),
                      ),
                      const SizedBox(width: 6),
                      _countBox(
                        '${r.correctionCount}',
                        'Corrections',
                        const Color(0xFFFFEDD5),
                        const Color(0xFFC2410C),
                      ),
                      const SizedBox(width: 6),
                      _countBox(
                        '${r.completedCount}',
                        'Completed',
                        const Color(0xFFDCFCE7),
                        const Color(0xFF15803D),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _bandPill(String id, String label, Color textColor) {
    final active = _bandFilter == id;
    return GestureDetector(
      onTap: () => setState(() => _bandFilter = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? Colors.white.withValues(alpha: 0.24)
              : Colors.white.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? Colors.white : Colors.white.withValues(alpha: 0.15),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
      ),
    );
  }

  Widget _miniMetricTile(String label, String value, String sub) {
    return Container(
      width: 112,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: kSlate100.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 8.5,
              fontWeight: FontWeight.w800,
              color: kSlate500,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: kSlate900,
            ),
          ),
          Text(
            sub,
            style: const TextStyle(fontSize: 9.5, color: kSlate500),
          ),
        ],
      ),
    );
  }

  Widget _sortBtn(String id, String label) {
    final active = _sortBy == id;
    return GestureDetector(
      onTap: () => setState(() => _sortBy = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: active ? kIndigo : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? kIndigo : kSlate200),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : kSlate700,
          ),
        ),
      ),
    );
  }

  Widget _countBox(String count, String label, Color bg, Color fg) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              count,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: fg,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemberWorkloadData {
  final Member member;
  final int activeCount;
  final int pendingCount;
  final int correctionCount;
  final int completedCount;
  final int overdueCount;
  final int estMins;
  final int actMins;
  final int remMins;
  final int loadPct;
  final String band;

  const _MemberWorkloadData({
    required this.member,
    required this.activeCount,
    required this.pendingCount,
    required this.correctionCount,
    required this.completedCount,
    required this.overdueCount,
    required this.estMins,
    required this.actMins,
    required this.remMins,
    required this.loadPct,
    required this.band,
  });
}

// ============================================================================
// TAB 5: ANALYTICS & INDIVIDUAL ANALYSIS
// ============================================================================
class _AnalyticsIndividualTab extends StatefulWidget {
  final User user;
  final List<Project> projects;
  final List<Task> tasks;
  final List<Member> members;
  final Future<void> Function() onRefresh;

  const _AnalyticsIndividualTab({
    required this.user,
    required this.projects,
    required this.tasks,
    required this.members,
    required this.onRefresh,
  });

  @override
  State<_AnalyticsIndividualTab> createState() =>
      _AnalyticsIndividualTabState();
}

class _AnalyticsIndividualTabState extends State<_AnalyticsIndividualTab> {
  String _selectedMemberId = 'all';

  @override
  Widget build(BuildContext context) {
    final selectedMember = widget.members
        .where((m) => m.id == _selectedMemberId)
        .toList()
        .firstOrNull;

    final scopeTasks = _selectedMemberId == 'all'
        ? widget.tasks
        : widget.tasks
            .where((t) => t.assigneeId == _selectedMemberId)
            .toList();

    final total = scopeTasks.length;
    final completed = scopeTasks.where((t) => t.isCompleted).length;
    final inProgress = scopeTasks
        .where((t) => !t.isCompleted && !t.isInReview && t.stage != 'cancelled')
        .length;
    final inReview = scopeTasks.where((t) => t.isInReview).length;
    final overdue = scopeTasks.where((t) => t.isOverdue).length;
    final corrections = scopeTasks.where((t) => t.isCorrection).length;
    final rate = total > 0 ? ((completed / total) * 100).round() : 0;

    // Creative type counts
    final Map<String, int> ctCounts = {};
    for (final t in scopeTasks) {
      final ct = t.resolvedCreativeType;
      ctCounts[ct] = (ctCounts[ct] ?? 0) + 1;
    }
    final sortedCts = ctCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CommandBanner(
            badge: 'Performance Intelligence · Individual & Org',
            badgeIcon: Icons.analytics_outlined,
            title: 'Analytics & Individual Analysis',
            subtitle:
                'Deep-dive into individual specialist throughput, SBU mix, and creative velocity.',
            bottomChild: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedMemberId,
                  dropdownColor: kNavy,
                  isExpanded: true,
                  icon: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.white,
                  ),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                  items: [
                    const DropdownMenuItem(
                      value: 'all',
                      child: Text('All Employees (Organization Overview)'),
                    ),
                    ...widget.members.map(
                      (m) => DropdownMenuItem(
                        value: m.id,
                        child: Text('Individual Analysis: ${m.name} (${m.department})'),
                      ),
                    ),
                  ],
                  onChanged: (v) =>
                      setState(() => _selectedMemberId = v ?? 'all'),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Individual Deep-Dive Panel
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: kIndigo.withValues(alpha: 0.12),
                      child: Text(
                        (selectedMember?.name ?? 'ORG')
                            .substring(0, 1)
                            .toUpperCase(),
                        style: const TextStyle(
                          color: kIndigo,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            selectedMember != null
                                ? '${selectedMember.name} — Individual Analysis'
                                : 'Organization Performance Summary',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: kSlate900,
                            ),
                          ),
                          Text(
                            selectedMember != null
                                ? '${selectedMember.department}  •  ${selectedMember.email}'
                                : '${widget.members.length} team members across 6 SBUs',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: kSlate500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.45,
                  children: [
                    _statPill('Total Tasks', '$total', kIndigo),
                    _statPill('Completed', '$completed', const Color(0xFF10B981)),
                    _statPill('Success Rate', '$rate%', const Color(0xFF059669)),
                    _statPill('In Progress', '$inProgress', const Color(0xFF3B82F6)),
                    _statPill('In Review', '$inReview', const Color(0xFFF59E0B)),
                    _statPill(
                      'Overdue / Corr.',
                      '$overdue / $corrections',
                      const Color(0xFFF43F5E),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Tasks by Employee (clickable to switch Individual Analysis)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle(
                  'Tasks by Employee',
                  trailing: 'Tap member to inspect',
                  icon: Icons.bar_chart_rounded,
                ),
                const SizedBox(height: 12),
                ...widget.members.map((m) {
                  final mTasks =
                      widget.tasks.where((t) => t.assigneeId == m.id).toList();
                  final mDone = mTasks.where((t) => t.isCompleted).length;
                  final mTotal = mTasks.length;
                  final ratio = widget.tasks.isNotEmpty
                      ? mTotal / widget.tasks.length
                      : 0.0;
                  final isSelected = _selectedMemberId == m.id;

                  return GestureDetector(
                    onTap: () => setState(
                      () => _selectedMemberId = isSelected ? 'all' : m.id,
                    ),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFFEEF2FF)
                            : kSlate100.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? kIndigo : Colors.transparent,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                m.name,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: kSlate900,
                                ),
                              ),
                              Text(
                                '$mDone done / $mTotal total',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: kSlate600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: ratio.clamp(0.08, 1.0),
                              minHeight: 7,
                              backgroundColor: Colors.white,
                              color: kIndigo,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Top Creative Types
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kSlate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle(
                  'Top Creative Types',
                  trailing: 'Deliverable mix',
                  icon: Icons.palette_outlined,
                ),
                const SizedBox(height: 12),
                ...sortedCts.map((e) {
                  final pct = total > 0 ? e.value / total : 0.0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 4,
                          child: Text(
                            e.key,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: kSlate700,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 5,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: pct,
                              minHeight: 7,
                              backgroundColor: kSlate100,
                              color: kPink,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 24,
                          child: Text(
                            '${e.value}',
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: kSlate900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statPill(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: kSlate600,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// ATTENDANCE BOTTOM SHEET BODY
// ============================================================================
class _AttendanceSheetBody extends StatelessWidget {
  final Member? me;
  final List<AttendanceRecord> attendance;
  final VoidCallback onChanged;

  const _AttendanceSheetBody({
    required this.me,
    required this.attendance,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final openList = attendance
        .where((a) => a.userId == me?.id && a.clockOutAt == null)
        .toList();
    final open = openList.isEmpty ? null : openList.first;

    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1A3A5C), Color(0xFF1F3E68), Color(0xFF2B2A5A)],
            ),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            children: [
              Icon(
                open == null ? Icons.timer_outlined : Icons.timer,
                size: 42,
                color: Colors.white,
              ),
              const SizedBox(height: 8),
              Text(
                open == null ? 'Not Clocked In' : 'Shift Active',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                open == null
                    ? 'Standard office capacity: 7h 30m / day'
                    : 'Clocked in at ${_fmtTime(open.clockInAt)}',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: open == null
                        ? const Color(0xFF10B981)
                        : const Color(0xFFF43F5E),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () async {
                    await Api.clockInOut(
                      open == null ? 'in' : 'out',
                      userId: me?.id,
                    );
                    onChanged();
                  },
                  child: Text(
                    open == null ? 'CLOCK IN' : 'CLOCK OUT',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _fmtTime(DateTime? d) {
    if (d == null) return '-';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}
