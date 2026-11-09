import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'theme.dart';
import 'widgets.dart';

Color parseHexColor(String? hex, Color fallback) {
  if (hex == null || hex.isEmpty) return fallback;
  final clean = hex.replaceAll('#', '').trim();
  if (clean.length == 6) {
    final val = int.tryParse('FF$clean', radix: 16);
    if (val != null) return Color(val);
  }
  return fallback;
}

class PeakPerformersAndLeaderboardSection extends StatelessWidget {
  final Map<String, dynamic> settings;
  final List<Member> members;
  final List<Task> tasks;
  final bool isAdmin;
  final VoidCallback onOpenSettings;

  const PeakPerformersAndLeaderboardSection({
    super.key,
    required this.settings,
    required this.members,
    required this.tasks,
    required this.isAdmin,
    required this.onOpenSettings,
  });

  @override
  Widget build(BuildContext context) {
    final lbCfg =
        (settings['leaderboardConfig'] as Map<String, dynamic>?) ?? const {};
    final peakCfg =
        (settings['peakPerformersConfig'] as Map<String, dynamic>?) ?? const {};
    final showLb = lbCfg['showOnDashboard'] != false;
    final showPeak = peakCfg['showBannerOnDashboard'] != false;

    if ((!showLb && !showPeak) || members.isEmpty) {
      return const SizedBox.shrink();
    }

    final ptsCompleted = (lbCfg['pointsPerCompleted'] as num?)?.toInt() ?? 10;
    final ptsOnTime = (lbCfg['pointsPerOnTime'] as num?)?.toInt() ?? 5;
    final ptsUrgent = (lbCfg['pointsPerUrgent'] as num?)?.toInt() ?? 5;
    final manualBonusMap =
        (lbCfg['manualBonusByUserId'] as Map<String, dynamic>?) ?? const {};

    final rows = members.map((m) {
      final mTasks = tasks.where((t) => t.assigneeId == m.id).toList();
      final done = mTasks.where((t) => t.isCompleted).toList();
      final urgentDone = done
          .where((t) => t.priority == 'urgent' || t.priority == 'high')
          .length;
      final bonus = (manualBonusMap[m.id] as num?)?.toInt() ?? 0;
      final score =
          done.length * ptsCompleted +
          done.length * ptsOnTime +
          urgentDone * ptsUrgent +
          bonus;
      final rate = mTasks.isNotEmpty
          ? ((done.length / mTasks.length) * 100).round()
          : 0;
      return {
        'member': m,
        'done': done.length,
        'total': mTasks.length,
        'rate': rate,
        'bonus': bonus,
        'score': score,
      };
    }).toList()
      ..sort((a, b) => (b['score'] as int).compareTo(a['score'] as int));

    final featuredIds =
        ((peakCfg['featuredUserIds'] as List?) ?? const [])
            .map((e) => '$e')
            .toList();
    final peakList = featuredIds.isNotEmpty
        ? rows
            .where((r) => featuredIds.contains((r['member'] as Member).id))
            .toList()
        : rows.take(3).toList();
    final notes =
        (peakCfg['spotlightNotes'] as Map<String, dynamic>?) ?? const {};

    final primary = parseHexColor(
      settings['primaryColor']?.toString(),
      kNavy,
    );
    final accent = parseHexColor(
      settings['accentColor']?.toString(),
      kPink,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showPeak && peakList.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [primary, const Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: primary.withValues(alpha: 0.18),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: const Color(0xFFFBBF24).withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.workspace_premium,
                            size: 14,
                            color: Color(0xFFFBBF24),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${peakCfg['badgeTitle'] ?? 'Peak Performed Users'}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFFDE68A),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    if (isAdmin)
                      InkWell(
                        onTap: onOpenSettings,
                        child: const Text(
                          'Configure',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFF9A8D4),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                ...peakList.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final r = entry.value;
                  final m = r['member'] as Member;
                  final note = notes[m.id]?.toString();
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(15),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.14),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [const Color(0xFFF59E0B), accent],
                            ),
                            borderRadius: BorderRadius.circular(11),
                          ),
                          child: Center(
                            child: Text(
                              (m.name.isNotEmpty ? m.name[0] : 'U')
                                  .toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      m.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.star_rounded,
                                    size: 14,
                                    color: Color(0xFFFBBF24),
                                  ),
                                ],
                              ),
                              Text(
                                (note != null && note.isNotEmpty)
                                    ? note
                                    : '${r['done']} tasks completed · ${r['rate']}% velocity',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.72),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Text(
                            '#${idx + 1} · ${r['score']} pts',
                            style: const TextStyle(
                              color: Color(0xFFFDE68A),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
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
        ],
        if (showLb) ...[
          Container(
            padding: const EdgeInsets.all(15),
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
                    const Icon(
                      Icons.emoji_events_rounded,
                      color: Color(0xFFF59E0B),
                      size: 19,
                    ),
                    const SizedBox(width: 7),
                    const Expanded(
                      child: Text(
                        'Organization User Leaderboard',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: kSlate900,
                        ),
                      ),
                    ),
                    if (isAdmin)
                      TextButton.icon(
                        onPressed: onOpenSettings,
                        icon: const Icon(Icons.tune, size: 14),
                        label: const Text(
                          'Manage',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                ...rows.take(5).toList().asMap().entries.map((entry) {
                  final idx = entry.key;
                  final r = entry.value;
                  final m = r['member'] as Member;
                  final rankColor = idx == 0
                      ? const Color(0xFFF59E0B)
                      : idx == 1
                      ? const Color(0xFF94A3B8)
                      : idx == 2
                      ? const Color(0xFFD97706)
                      : kSlate200;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 7),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(color: kSlate200.withValues(alpha: 0.7)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: rankColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              '#${idx + 1}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: idx < 3 ? Colors.white : kSlate700,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: kSlate900,
                                ),
                              ),
                              Text(
                                '${m.department ?? 'Creative'} · ${r['done']}/${r['total']} done (${r['rate']}%)',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: kSlate500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: kSlate900,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: Text(
                            '${r['score']} pts',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
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
        ],
      ],
    );
  }
}

Future<void> showAdminSettingsSheet({
  required BuildContext context,
  required Map<String, dynamic> initialSettings,
  required List<Member> members,
  required List<Task> tasks,
  required ValueChanged<Map<String, dynamic>> onSaved,
  required VoidCallback onMembersChanged,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _AdminSettingsSheetBody(
      initialSettings: initialSettings,
      members: members,
      tasks: tasks,
      onSaved: onSaved,
      onMembersChanged: onMembersChanged,
    ),
  );
}

class _AdminSettingsSheetBody extends StatefulWidget {
  final Map<String, dynamic> initialSettings;
  final List<Member> members;
  final List<Task> tasks;
  final ValueChanged<Map<String, dynamic>> onSaved;
  final VoidCallback onMembersChanged;

  const _AdminSettingsSheetBody({
    required this.initialSettings,
    required this.members,
    required this.tasks,
    required this.onSaved,
    required this.onMembersChanged,
  });

  @override
  State<_AdminSettingsSheetBody> createState() =>
      _AdminSettingsSheetBodyState();
}

class _AdminSettingsSheetBodyState extends State<_AdminSettingsSheetBody> {
  int _section = 0;
  bool _saving = false;
  String? _toast;
  late Map<String, dynamic> _settings;
  late List<Member> _members;

  // Entity controllers
  late TextEditingController _entityNameCtrl;
  late TextEditingController _entitySubCtrl;
  late TextEditingController _logoUrlCtrl;
  late TextEditingController _entityEmailCtrl;
  late TextEditingController _entityPhoneCtrl;

  // New SBU controllers
  final _newSbuNameCtrl = TextEditingController();
  final _newSbuCodeCtrl = TextEditingController();

  // New User controllers
  final _newUserNameCtrl = TextEditingController();
  final _newUserEmailCtrl = TextEditingController();
  final _newUserEmpIdCtrl = TextEditingController();
  final _newUserPassCtrl = TextEditingController(text: 'demo123');
  String _newUserRole = 'member';

  // Peak performer controllers
  late TextEditingController _peakBadgeCtrl;
  late TextEditingController _peakPeriodCtrl;

  @override
  void initState() {
    super.initState();
    _settings = Map<String, dynamic>.from(widget.initialSettings);
    _members = List<Member>.from(widget.members);
    _entityNameCtrl = TextEditingController(
      text: '${_settings['entityName'] ?? 'Digiventures'}',
    );
    _entitySubCtrl = TextEditingController(
      text: '${_settings['entitySubtitle'] ?? 'CREATIVE WORKFLOW OS'}',
    );
    _logoUrlCtrl = TextEditingController(
      text: '${_settings['logoUrl'] ?? '/logo.png'}',
    );
    _entityEmailCtrl = TextEditingController(
      text: '${_settings['entityEmail'] ?? 'ops@achariya.ai'}',
    );
    _entityPhoneCtrl = TextEditingController(
      text: '${_settings['entityPhone'] ?? '+91 98765 43210'}',
    );
    final peakCfg =
        (_settings['peakPerformersConfig'] as Map<String, dynamic>?) ?? {};
    _peakBadgeCtrl = TextEditingController(
      text: '${peakCfg['badgeTitle'] ?? 'Peak Performer of the Month'}',
    );
    _peakPeriodCtrl = TextEditingController(
      text: '${peakCfg['periodLabel'] ?? 'November 2026'}',
    );
  }

  @override
  void dispose() {
    _entityNameCtrl.dispose();
    _entitySubCtrl.dispose();
    _logoUrlCtrl.dispose();
    _entityEmailCtrl.dispose();
    _entityPhoneCtrl.dispose();
    _newSbuNameCtrl.dispose();
    _newSbuCodeCtrl.dispose();
    _newUserNameCtrl.dispose();
    _newUserEmailCtrl.dispose();
    _newUserEmpIdCtrl.dispose();
    _newUserPassCtrl.dispose();
    _peakBadgeCtrl.dispose();
    _peakPeriodCtrl.dispose();
    super.dispose();
  }

  Future<void> _persist([Map<String, dynamic>? patch]) async {
    setState(() => _saving = true);
    final next = {
      ..._settings,
      'entityName': _entityNameCtrl.text.trim(),
      'entitySubtitle': _entitySubCtrl.text.trim(),
      'logoUrl': _logoUrlCtrl.text.trim(),
      'entityEmail': _entityEmailCtrl.text.trim(),
      'entityPhone': _entityPhoneCtrl.text.trim(),
      if (patch != null) ...patch,
    };
    final saved = await Api.saveSettings(next);
    if (!mounted) return;
    setState(() {
      _settings = saved;
      _saving = false;
      _toast = 'Saved & synced to workspace database!';
    });
    widget.onSaved(saved);
  }

  @override
  Widget build(BuildContext context) {
    final primary = parseHexColor(
      _settings['primaryColor']?.toString(),
      kNavy,
    );
    final accent = parseHexColor(_settings['accentColor']?.toString(), kPink);

    final sections = const [
      (Icons.business_rounded, '1. Entity & Logo'),
      (Icons.palette_outlined, '2. Color Scheme'),
      (Icons.layers_outlined, '3. SBU Names'),
      (Icons.group_add_outlined, '4. Users'),
      (Icons.widgets_outlined, '5. Modules'),
      (Icons.emoji_events_outlined, '6. Leaderboard'),
      (Icons.workspace_premium_outlined, '7. Peak Users'),
    ];

    return DraggableScrollableSheet(
      initialChildSize: 0.90,
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
              padding: const EdgeInsets.fromLTRB(18, 12, 12, 14),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [primary, accent]),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        Icons.admin_panel_settings_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_entityNameCtrl.text} — Admin Settings',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const Text(
                              'Entity · Colors · SBUs · Users · Modules · Leaderboard · Peak',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Section selector chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: List.generate(sections.length, (i) {
                  final active = _section == i;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      selected: active,
                      selectedColor: primary,
                      labelStyle: TextStyle(
                        color: active ? Colors.white : kSlate700,
                        fontWeight: FontWeight.w700,
                        fontSize: 11.5,
                      ),
                      avatar: Icon(
                        sections[i].$1,
                        size: 15,
                        color: active ? Colors.white : kSlate700,
                      ),
                      label: Text(sections[i].$2),
                      onSelected: (_) => setState(() => _section = i),
                    ),
                  );
                }),
              ),
            ),

            if (_toast != null)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF059669),
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _toast!,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF065F46),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.all(16),
                children: [
                  if (_section == 0) _buildEntitySection(),
                  if (_section == 1) _buildColorSection(),
                  if (_section == 2) _buildSbuSection(),
                  if (_section == 3) _buildUsersSection(),
                  if (_section == 4) _buildModulesSection(),
                  if (_section == 5) _buildLeaderboardSection(),
                  if (_section == 6) _buildPeakPerformersSection(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEntitySection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('1. Entity Name, Logo & Details', icon: Icons.business),
          const SizedBox(height: 12),
          TextField(
            controller: _entityNameCtrl,
            onChanged: (_) => setState(() {}),
            decoration: fieldDecoration('Entity Name (e.g. Digiventures)', icon: Icons.badge_outlined),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _entitySubCtrl,
            decoration: fieldDecoration('Subtitle (e.g. CREATIVE WORKFLOW OS)', icon: Icons.subtitles_outlined),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _logoUrlCtrl,
            decoration: fieldDecoration('Logo URL (/logo.png or https://...)', icon: Icons.image_outlined),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _entityEmailCtrl,
            decoration: fieldDecoration('Entity Email (ops@achariya.ai)', icon: Icons.mail_outline),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _entityPhoneCtrl,
            decoration: fieldDecoration('Contact Phone', icon: Icons.phone_outlined),
          ),
          const SizedBox(height: 16),
          GradientButton(
            label: 'Save Entity Details',
            icon: Icons.save_outlined,
            loading: _saving,
            onPressed: _persist,
          ),
        ],
      ),
    );
  }

  Widget _buildColorSection() {
    final presets = const [
      ('navy-pink', 'Digiventures Navy & Pink', '#1A3A5C', '#E91E63', '#4F46E5'),
      ('royal-indigo', 'Royal Indigo & Violet', '#1E1B4B', '#6366F1', '#8B5CF6'),
      ('emerald-teal', 'Emerald & Cyber Teal', '#064E3B', '#10B981', '#0D9488'),
      ('crimson-amber', 'Crimson & Gold', '#450A0A', '#F43F5E', '#F59E0B'),
      ('violet-fuchsia', 'Cosmic Violet & Fuchsia', '#2E1065', '#D946EF', '#9333EA'),
      ('slate-cyan', 'Midnight Slate & Cyan', '#0F172A', '#06B6D4', '#3B82F6'),
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('2. Workspace Color Scheme', icon: Icons.palette_outlined),
          const SizedBox(height: 12),
          ...presets.map((p) {
            final selected = _settings['colorScheme'] == p.$1;
            final c1 = parseHexColor(p.$3, kNavy);
            final c2 = parseHexColor(p.$4, kPink);
            return GestureDetector(
              onTap: () {
                _persist({
                  'colorScheme': p.$1,
                  'primaryColor': p.$3,
                  'accentColor': p.$4,
                  'secondaryColor': p.$5,
                });
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [c1, c2]),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: selected ? Colors.amberAccent : Colors.transparent,
                    width: 2.2,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        p.$2,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    if (selected)
                      const Icon(Icons.check_circle, color: Colors.white, size: 18),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSbuSection() {
    final sbus = List<Map<String, dynamic>>.from(
      ((_settings['sbuList'] as List?) ?? const []).map(
        (e) => Map<String, dynamic>.from(e as Map),
      ),
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('3. Create or Edit SBU Names', icon: Icons.layers_outlined),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _newSbuNameCtrl,
                  decoration: fieldDecoration('New SBU Name'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _newSbuCodeCtrl,
                  decoration: fieldDecoration('Code'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () {
                  final name = _newSbuNameCtrl.text.trim();
                  if (name.isEmpty) return;
                  final code = _newSbuCodeCtrl.text.trim().isEmpty
                      ? name.substring(0, name.length > 3 ? 3 : name.length).toUpperCase()
                      : _newSbuCodeCtrl.text.trim().toUpperCase();
                  final next = [
                    ...sbus,
                    {
                      'id': 'sbu-${DateTime.now().millisecondsSinceEpoch}',
                      'name': name,
                      'code': code,
                      'color': '#4F46E5',
                      'active': true,
                    },
                  ];
                  _newSbuNameCtrl.clear();
                  _newSbuCodeCtrl.clear();
                  _persist({'sbuList': next});
                },
                child: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...sbus.asMap().entries.map((entry) {
            final idx = entry.key;
            final s = entry.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kSlate200),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: '${s['name']}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        isDense: true,
                      ),
                      onFieldSubmitted: (v) {
                        sbus[idx]['name'] = v.trim();
                        _persist({'sbuList': sbus});
                      },
                    ),
                  ),
                  Text(
                    '${s['code'] ?? ''}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: kIndigo,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                    onPressed: () {
                      sbus.removeAt(idx);
                      _persist({'sbuList': sbus});
                    },
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildUsersSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('4. Add or Remove Users (@achariya.ai)', icon: Icons.people_outline),
          const SizedBox(height: 12),
          TextField(
            controller: _newUserNameCtrl,
            decoration: fieldDecoration('Full Name *', icon: Icons.person_add_alt_1),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _newUserEmailCtrl,
                  decoration: fieldDecoration('user@achariya.ai'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _newUserEmpIdCtrl,
                  decoration: fieldDecoration('EMP-006'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              DropdownButton<String>(
                value: _newUserRole,
                items: const [
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(value: 'manager', child: Text('Manager')),
                  DropdownMenuItem(value: 'member', child: Text('Member')),
                  DropdownMenuItem(value: 'trainee', child: Text('Trainee')),
                ],
                onChanged: (v) => setState(() => _newUserRole = v ?? 'member'),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () async {
                  if (_newUserNameCtrl.text.trim().isEmpty) return;
                  final created = await Api.createMember({
                    'name': _newUserNameCtrl.text.trim(),
                    'email': _newUserEmailCtrl.text.trim(),
                    'employeeId': _newUserEmpIdCtrl.text.trim(),
                    'role': _newUserRole,
                    'password': _newUserPassCtrl.text.trim(),
                  });
                  if (!mounted) return;
                  setState(() {
                    _members.add(created);
                    _newUserNameCtrl.clear();
                    _newUserEmailCtrl.clear();
                    _newUserEmpIdCtrl.clear();
                    _toast = 'Added ${created.name} (${created.email})!';
                  });
                  widget.onMembersChanged();
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add User'),
              ),
            ],
          ),
          const Divider(height: 24),
          ..._members.map(
            (m) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(
                m.name,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
              subtitle: Text(
                '${m.email} · ${m.role.toUpperCase()}',
                style: const TextStyle(fontSize: 11, color: kIndigo),
              ),
              trailing: IconButton(
                icon: const Icon(Icons.person_remove_outlined, color: Colors.redAccent, size: 18),
                onPressed: () async {
                  await Api.deleteMember(m.id);
                  if (!mounted) return;
                  setState(() {
                    _members.removeWhere((x) => x.id == m.id);
                    _toast = 'Removed ${m.name}';
                  });
                  widget.onMembersChanged();
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModulesSection() {
    final modules = List<Map<String, dynamic>>.from(
      ((_settings['modules'] as List?) ?? const []).map(
        (e) => Map<String, dynamic>.from(e as Map),
      ),
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('5. Modules Displayed to Users', icon: Icons.widgets_outlined),
          const SizedBox(height: 10),
          ...modules.asMap().entries.map((entry) {
            final idx = entry.key;
            final mod = entry.value;
            final enabled = mod['enabled'] != false;
            return SwitchListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              value: enabled,
              title: Text(
                '${mod['label']}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
              subtitle: Text(
                'Roles: ${(mod['roles'] as List?)?.join(', ') ?? 'all'}',
                style: const TextStyle(fontSize: 11),
              ),
              onChanged: (v) {
                modules[idx]['enabled'] = v;
                _persist({'modules': modules});
              },
            );
          }),
        ],
      ),
    );
  }

  Widget _buildLeaderboardSection() {
    final lbCfg = Map<String, dynamic>.from(
      (_settings['leaderboardConfig'] as Map<String, dynamic>?) ?? {},
    );
    final bonusMap = Map<String, dynamic>.from(
      (lbCfg['manualBonusByUserId'] as Map<String, dynamic>?) ?? {},
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('6. User Leaderboard & Bonus Points', icon: Icons.emoji_events_outlined),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Show Leaderboard on Dashboard',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
            ),
            value: lbCfg['showOnDashboard'] != false,
            onChanged: (v) {
              lbCfg['showOnDashboard'] = v;
              _persist({'leaderboardConfig': lbCfg});
            },
          ),
          const Divider(),
          ..._members.map((m) {
            final curBonus = (bonusMap[m.id] as num?)?.toInt() ?? 0;
            return ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(
                m.name,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
              ),
              subtitle: Text(m.email, style: const TextStyle(fontSize: 11)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 18),
                    onPressed: () {
                      bonusMap[m.id] = curBonus - 5;
                      lbCfg['manualBonusByUserId'] = bonusMap;
                      _persist({'leaderboardConfig': lbCfg});
                    },
                  ),
                  Text(
                    '$curBonus bonus',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 18, color: kIndigo),
                    onPressed: () {
                      bonusMap[m.id] = curBonus + 5;
                      lbCfg['manualBonusByUserId'] = bonusMap;
                      _persist({'leaderboardConfig': lbCfg});
                    },
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildPeakPerformersSection() {
    final peakCfg = Map<String, dynamic>.from(
      (_settings['peakPerformersConfig'] as Map<String, dynamic>?) ?? {},
    );
    final featured = List<String>.from(
      ((peakCfg['featuredUserIds'] as List?) ?? const []).map((e) => '$e'),
    );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kSlate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('7. Peak Performed Users Spotlight', icon: Icons.workspace_premium_outlined),
          const SizedBox(height: 10),
          TextField(
            controller: _peakBadgeCtrl,
            decoration: fieldDecoration('Recognition Title'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _peakPeriodCtrl,
            decoration: fieldDecoration('Period Label (e.g. November 2026)'),
          ),
          const SizedBox(height: 10),
          GradientButton(
            label: 'Save Spotlight Titles',
            icon: Icons.save_outlined,
            loading: _saving,
            onPressed: () {
              peakCfg['badgeTitle'] = _peakBadgeCtrl.text.trim();
              peakCfg['periodLabel'] = _peakPeriodCtrl.text.trim();
              _persist({'peakPerformersConfig': peakCfg});
            },
          ),
          const Divider(height: 22),
          const Text(
            'Tap to Pin / Unpin Peak Performers:',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          ..._members.map((m) {
            final isPinned = featured.contains(m.id);
            return CheckboxListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              value: isPinned,
              title: Text(
                m.name,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
              ),
              subtitle: Text('${m.title ?? m.role} · ${m.email}', style: const TextStyle(fontSize: 11)),
              onChanged: (v) {
                if (v == true) {
                  featured.add(m.id);
                } else {
                  featured.remove(m.id);
                }
                peakCfg['featuredUserIds'] = featured;
                _persist({'peakPerformersConfig': peakCfg});
              },
            );
          }),
        ],
      ),
    );
  }
}
