import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'theme.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinished;
  const SplashScreen({super.key, required this.onFinished});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _mainCtrl;
  late final AnimationController _pulseCtrl;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoDraw;
  late final Animation<double> _titleFade;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _chipsFade;
  late final Animation<double> _progressVal;
  Timer? _navTimer;

  @override
  void initState() {
    super.initState();

    _mainCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _logoScale = CurvedAnimation(
      parent: _mainCtrl,
      curve: const Interval(0.0, 0.45, curve: Curves.easeOutBack),
    );

    _logoDraw = CurvedAnimation(
      parent: _mainCtrl,
      curve: const Interval(0.10, 0.65, curve: Curves.easeInOutCubic),
    );

    _titleFade = CurvedAnimation(
      parent: _mainCtrl,
      curve: const Interval(0.35, 0.72, curve: Curves.easeOut),
    );

    _titleSlide = Tween<Offset>(
      begin: const Offset(0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _mainCtrl,
        curve: const Interval(0.35, 0.72, curve: Curves.easeOutCubic),
      ),
    );

    _chipsFade = CurvedAnimation(
      parent: _mainCtrl,
      curve: const Interval(0.55, 0.88, curve: Curves.easeOut),
    );

    _progressVal = CurvedAnimation(
      parent: _mainCtrl,
      curve: const Interval(0.15, 0.98, curve: Curves.easeInOut),
    );

    _mainCtrl.forward();
    _navTimer = Timer(const Duration(milliseconds: 2700), () {
      if (mounted) widget.onFinished();
    });
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    _mainCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GestureDetector(
        onTap: widget.onFinished,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xFF0F253E),
                Color(0xFF1A3A5C),
                Color(0xFF2B2A5A),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: AnimatedBuilder(
            animation: Listenable.merge([_mainCtrl, _pulseCtrl]),
            builder: (context, _) {
              final pulse = _pulseCtrl.value;
              return Stack(
                alignment: Alignment.center,
                children: [
                  // Animated ambient glow orbs
                  Positioned(
                    top: -70 + (pulse * 18),
                    left: -60 + (pulse * 12),
                    child: _ambientOrb(
                      260,
                      kIndigo.withValues(alpha: 0.28),
                    ),
                  ),
                  Positioned(
                    bottom: -80 + (pulse * 16),
                    right: -60 + (pulse * 14),
                    child: _ambientOrb(
                      280,
                      kPink.withValues(alpha: 0.24),
                    ),
                  ),

                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 32,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Spacer(flex: 3),

                          // Animated Logo + Pulsing Halo Ring
                          SizedBox(
                            width: 136,
                            height: 136,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Outer pulsing halo
                                Transform.scale(
                                  scale: 0.92 + (pulse * 0.16),
                                  child: Container(
                                    width: 124,
                                    height: 124,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: kPink.withValues(
                                          alpha: 0.25 * (1 - pulse * 0.4),
                                        ),
                                        width: 1.8,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: kIndigo.withValues(alpha: 0.35),
                                          blurRadius: 32,
                                          spreadRadius: 4,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                                // Rotating orbital arc
                                Transform.rotate(
                                  angle: _mainCtrl.value * math.pi * 2,
                                  child: CustomPaint(
                                    size: const Size(128, 128),
                                    painter: _OrbitArcPainter(),
                                  ),
                                ),

                                // Main glassmorphic logo tile
                                Transform.scale(
                                  scale: _logoScale.value,
                                  child: Container(
                                    width: 92,
                                    height: 92,
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(28),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(
                                            alpha: 0.28,
                                          ),
                                          blurRadius: 24,
                                          offset: const Offset(0, 12),
                                        ),
                                      ],
                                    ),
                                    child: CustomPaint(
                                      painter: _AnimatedDigiventuresPainter(
                                        progress: _logoDraw.value,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 26),

                          // Animated Brand Title & Tagline
                          FadeTransition(
                            opacity: _titleFade,
                            child: SlideTransition(
                              position: _titleSlide,
                              child: Column(
                                children: [
                                  const Text(
                                    'Digiventures',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 32,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      letterSpacing: -0.6,
                                      height: 1.05,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(
                                        alpha: 0.10,
                                      ),
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(
                                        color: Colors.white.withValues(
                                          alpha: 0.18,
                                        ),
                                      ),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.auto_awesome,
                                          size: 13,
                                          color: Color(0xFFF472B6),
                                        ),
                                        SizedBox(width: 6),
                                        Flexible(
                                          child: Text(
                                            'CREATIVE WORKFLOW OS',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w800,
                                              color: Color(0xFFC7D2FE),
                                              letterSpacing: 1.5,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Animated SBU Ecosystem Pills
                          FadeTransition(
                            opacity: _chipsFade,
                            child: Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 6,
                              runSpacing: 6,
                              children: const [
                                _SbuSplashChip('Achariya'),
                                _SbuSplashChip('AGOC'),
                                _SbuSplashChip('Miway'),
                                _SbuSplashChip('Q School'),
                                _SbuSplashChip('WIN Real Estate'),
                                _SbuSplashChip('WOW'),
                              ],
                            ),
                          ),

                          const Spacer(flex: 3),

                          // Bottom Loading Progress Bar
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 220),
                            child: Column(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: SizedBox(
                                    height: 5,
                                    width: double.infinity,
                                    child: Stack(
                                      children: [
                                        Container(
                                          color: Colors.white.withValues(
                                            alpha: 0.14,
                                          ),
                                        ),
                                        FractionallySizedBox(
                                          widthFactor: _progressVal.value.clamp(
                                            0.0,
                                            1.0,
                                          ),
                                          child: Container(
                                            decoration: const BoxDecoration(
                                              gradient: LinearGradient(
                                                colors: [
                                                  Color(0xFF818CF8),
                                                  Color(0xFFEC4899),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Synchronizing 11-stage creative pipeline...',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white.withValues(alpha: 0.65),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _ambientOrb(double size, Color color) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}

class _SbuSplashChip extends StatelessWidget {
  final String label;
  const _SbuSplashChip(this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: Colors.white70,
        ),
      ),
    );
  }
}

class _OrbitArcPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        colors: [
          Colors.transparent,
          Color(0xFF818CF8),
          Color(0xFFEC4899),
          Colors.transparent,
        ],
      ).createShader(rect);

    canvas.drawArc(
      rect.deflate(4),
      0,
      math.pi * 1.35,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _AnimatedDigiventuresPainter extends CustomPainter {
  final double progress;
  const _AnimatedDigiventuresPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Navy D-shield outline
    final stroke = Paint()
      ..color = kNavy
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

    // 2. Animated rising bars
    final barProgress = ((progress - 0.15) / 0.65).clamp(0.0, 1.0);
    final bars = [
      [0.30, 0.58, 0.22],
      [0.44, 0.46, 0.34],
      [0.58, 0.34, 0.46],
    ];
    final barPaint = Paint()
      ..color = kNavy
      ..style = PaintingStyle.fill;
    for (final b in bars) {
      final fullHeight = h * b[2];
      final currentHeight = fullHeight * barProgress;
      final bottomY = h * (b[1] + b[2]);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            w * b[0],
            bottomY - currentHeight,
            w * 0.08,
            currentHeight,
          ),
          const Radius.circular(2),
        ),
        barPaint,
      );
    }

    // 3. Pink ascending growth arrow
    if (progress > 0.35) {
      final arrowAlpha = ((progress - 0.35) / 0.65).clamp(0.0, 1.0);
      final arrow = Paint()
        ..color = kPink.withValues(alpha: arrowAlpha)
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
  }

  @override
  bool shouldRepaint(covariant _AnimatedDigiventuresPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

