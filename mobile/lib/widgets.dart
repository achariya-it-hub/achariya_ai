import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'models.dart';
import 'theme.dart';

class BrandLogo extends StatelessWidget {
  final double size;
  final bool lightText;
  const BrandLogo({super.key, this.size = 42, this.lightText = false});

  @override
  Widget build(BuildContext context) {
    final textColor = lightText ? Colors.white : kNavy;
    final subColor = lightText ? const Color(0xFFA5B4FC) : kPink;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          height: size,
          width: size,
          decoration: BoxDecoration(
            color: lightText ? Colors.white.withValues(alpha: 0.14) : Colors.white,
            borderRadius: BorderRadius.circular(size * 0.3),
            border: Border.all(
              color: lightText
                  ? Colors.white.withValues(alpha: 0.22)
                  : kSlate200.withValues(alpha: 0.8),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: EdgeInsets.all(size * 0.16),
          child: CustomPaint(painter: _LogoPainter(light: lightText)),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Digiventures',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: size * 0.44,
                  fontWeight: FontWeight.w800,
                  color: textColor,
                  height: 1.05,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'CREATIVE WORKFLOW OS',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: size * 0.19,
                  fontWeight: FontWeight.w700,
                  color: subColor,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LogoPainter extends CustomPainter {
  final bool light;
  const _LogoPainter({this.light = false});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final stroke = Paint()
      ..color = light ? Colors.white : kNavy
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.11
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path()
      ..moveTo(w * 0.18, h * 0.12)
      ..lineTo(w * 0.48, h * 0.12)
      ..cubicTo(w * 0.78, h * 0.12, w * 0.92, h * 0.30, w * 0.92, h * 0.50)
      ..cubicTo(w * 0.92, h * 0.70, w * 0.78, h * 0.88, w * 0.48, h * 0.88)
      ..lineTo(w * 0.18, h * 0.88)
      ..close();
    canvas.drawPath(path, stroke);

    final bars = [
      [0.30, 0.58, 0.22],
      [0.44, 0.46, 0.34],
      [0.58, 0.34, 0.46],
    ];
    final barPaint = Paint()
      ..color = light ? const Color(0xFF818CF8) : kNavy
      ..style = PaintingStyle.fill;
    for (final b in bars) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(w * b[0], h * b[1], w * 0.08, h * b[2]),
          const Radius.circular(2),
        ),
        barPaint,
      );
    }

    final arrow = Paint()
      ..color = kPink
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.095
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final aPath = Path()
      ..moveTo(w * 0.24, h * 0.52)
      ..lineTo(w * 0.42, h * 0.36)
      ..lineTo(w * 0.54, h * 0.44)
      ..lineTo(w * 0.78, h * 0.20);
    canvas.drawPath(aPath, arrow);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Digiventures `#1A3A5C` -> `#1F3E68` -> `#2B2A5A` Hero Command Banner
class CommandBanner extends StatelessWidget {
  final String badge;
  final IconData badgeIcon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final Widget? bottomChild;

  const CommandBanner({
    super.key,
    required this.badge,
    required this.badgeIcon,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.bottomChild,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A3A5C), Color(0xFF1F3E68), Color(0xFF2B2A5A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: kNavy.withValues(alpha: 0.25),
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
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.15),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        badgeIcon,
                        size: 13,
                        color: const Color(0xFFF472B6),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          badge.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFC7D2FE),
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 8),
                trailing!,
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.75),
            ),
          ),
          if (bottomChild != null) ...[
            const SizedBox(height: 12),
            bottomChild!,
          ],
        ],
      ),
    );
  }
}

/// Bento KPI Card with top 4px gradient accent bar matching our redesigned web UI
class BentoKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String caption;
  final IconData icon;
  final Color accentColor;
  final VoidCallback? onTap;

  const BentoKpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.caption,
    required this.icon,
    required this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: kSlate200.withValues(alpha: 0.85)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 4,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [accentColor, accentColor.withValues(alpha: 0.55)],
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            label.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                              color: kSlate500,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          height: 24,
                          width: 24,
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Icon(icon, size: 13, color: accentColor),
                        ),
                      ],
                    ),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: kSlate900,
                        letterSpacing: -0.4,
                        height: 1.1,
                      ),
                    ),
                    Text(
                      caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: kSlate500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StageBadge extends StatelessWidget {
  final String stage;
  const StageBadge({super.key, required this.stage});

  @override
  Widget build(BuildContext context) {
    final info = getStageInfo(stage);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
      decoration: BoxDecoration(
        color: info.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(color: info.dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              info.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: info.fg,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PriorityBadge extends StatelessWidget {
  final String priority;
  const PriorityBadge({super.key, required this.priority});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label;
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'critical':
        bg = const Color(0xFFFFE4E6);
        fg = const Color(0xFFBE123C);
        label = 'Critical';
        break;
      case 'high':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFB45309);
        label = 'High';
        break;
      case 'low':
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF475569);
        label = 'Low';
        break;
      default:
        bg = const Color(0xFFE0E7FF);
        fg = const Color(0xFF4338CA);
        label = 'Medium';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          color: fg,
        ),
      ),
    );
  }
}

class SbuPill extends StatelessWidget {
  final String sbu;
  const SbuPill({super.key, required this.sbu});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF2FF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: const BoxDecoration(
              color: kIndigo,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              sbu,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: Color(0xFF3730A3),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class RadialGauge extends StatelessWidget {
  final int percent;
  final String subtitle;
  final double size;
  final Color color;

  const RadialGauge({
    super.key,
    required this.percent,
    required this.subtitle,
    this.size = 110,
    this.color = kIndigo,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RadialGaugePainter(
              percent: percent.clamp(0, 100) / 100.0,
              color: color,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$percent%',
                style: TextStyle(
                  fontSize: size * 0.21,
                  fontWeight: FontWeight.w900,
                  color: kSlate900,
                ),
              ),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: size * 0.095,
                  fontWeight: FontWeight.w600,
                  color: kSlate500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RadialGaugePainter extends CustomPainter {
  final double percent;
  final Color color;

  const _RadialGaugePainter({required this.percent, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final strokeWidth = size.width * 0.11;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final trackPaint = Paint()
      ..color = kSlate100
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final arcPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    const startAngle = math.pi * 0.75;
    const sweepTotal = math.pi * 1.5;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepTotal,
      false,
      trackPaint,
    );

    if (percent > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepTotal * percent,
        false,
        arcPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RadialGaugePainter oldDelegate) =>
      oldDelegate.percent != percent || oldDelegate.color != color;
}

class GradientButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final Gradient gradient;
  final double height;

  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.icon,
    this.gradient = kBrandGradient,
    this.height = 50,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: onPressed == null ? null : gradient,
        color: onPressed == null ? kSlate200 : null,
        borderRadius: BorderRadius.circular(14),
        boxShadow: onPressed == null
            ? null
            : [
                BoxShadow(
                  color: kIndigo.withValues(alpha: 0.28),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: loading ? null : onPressed,
          child: Center(
            child: loading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                      if (icon != null) ...[
                        const SizedBox(width: 8),
                        Icon(icon, color: Colors.white, size: 18),
                      ],
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Gradient gradient;
  final String? caption;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.caption,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: kSlate200.withValues(alpha: 0.8)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontSize: 11,
                      color: kSlate500,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  height: 30,
                  width: 30,
                  decoration: BoxDecoration(
                    gradient: gradient,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Icon(icon, color: Colors.white, size: 16),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: kSlate900,
                height: 1.1,
              ),
            ),
            if (caption != null) ...[
              const SizedBox(height: 2),
              Text(
                caption!,
                style: const TextStyle(fontSize: 10, color: kSlate500),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? trailing;
  final IconData? icon;
  const SectionTitle(this.title, {super.key, this.trailing, this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: kIndigo),
          const SizedBox(width: 6),
        ],
        Expanded(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: kSlate900,
            ),
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              trailing!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11.5,
                color: kSlate500,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
