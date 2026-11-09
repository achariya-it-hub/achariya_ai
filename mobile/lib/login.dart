import 'package:flutter/material.dart';
import 'api.dart';
import 'models.dart';
import 'theme.dart';
import 'widgets.dart';

class LoginPage extends StatefulWidget {
  final ValueChanged<User> onSignedIn;
  const LoginPage({super.key, required this.onSignedIn});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    final email = _email.text.trim();
    final pass = _password.text;
    if (email.isEmpty || pass.isEmpty) {
      setState(() => _error = 'Please enter your email and password.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final u = await Api.login(email, pass);
      if (mounted) widget.onSignedIn(u);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showServerSwitcher() {
    final ctrl = TextEditingController(text: Api.baseUrl);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Workspace Server Endpoint',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: kSlate900,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Connected to the live Achariya Creative Workflow OS by default.',
              style: TextStyle(fontSize: 12, color: kSlate500),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.cloud_done_outlined, size: 16, color: kIndigo),
                  label: const Text('Live Cloud (achariya-ai.netlify.app)'),
                  onPressed: () {
                    ctrl.text = 'https://achariya-ai.netlify.app';
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.computer_outlined, size: 16, color: kPurple),
                  label: const Text('Localhost (http://localhost:3000)'),
                  onPressed: () {
                    ctrl.text = 'http://localhost:3000';
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              decoration: fieldDecoration('Server Base URL', icon: Icons.link),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: GradientButton(
                label: 'Save Endpoint',
                icon: Icons.check_circle_outline,
                onPressed: () {
                  setState(() {
                    Api.setBaseUrl(ctrl.text);
                  });
                  Navigator.pop(ctx);
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
    final isLive = Api.baseUrl.contains('achariya-ai.netlify.app');
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: kLoginBgGradient),
        child: Stack(
          children: [
            Positioned(
              top: -90,
              left: -80,
              child: _glowBlob(260, kIndigo.withValues(alpha: 0.14)),
            ),
            Positioned(
              bottom: -100,
              right: -70,
              child: _glowBlob(280, kPink.withValues(alpha: 0.12)),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      children: [
                        // Server status pill
                        GestureDetector(
                          onTap: _showServerSwitcher,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.85),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: kSlate200),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: isLive
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFF59E0B),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  isLive
                                      ? 'Connected: achariya-ai.netlify.app'
                                      : 'Server: ${Api.baseUrl}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: kSlate700,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.tune,
                                  size: 13,
                                  color: kSlate500,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.fromLTRB(26, 30, 26, 26),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.94),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: Colors.white, width: 1.4),
                            boxShadow: [
                              BoxShadow(
                                color: kNavy.withValues(alpha: 0.10),
                                blurRadius: 36,
                                offset: const Offset(0, 18),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const BrandLogo(size: 52),
                              const SizedBox(height: 22),
                              const Text(
                                'Welcome back',
                                style: TextStyle(
                                  fontSize: 23,
                                  fontWeight: FontWeight.w800,
                                  color: kSlate900,
                                  letterSpacing: -0.4,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Sign in to your Creative Workflow OS workspace',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: kSlate500),
                              ),
                              const SizedBox(height: 22),
                              if (_error != null) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 11,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: const Color(0xFFFECACA),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.error_outline,
                                        size: 18,
                                        color: Color(0xFFDC2626),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _error!,
                                          style: const TextStyle(
                                            color: Color(0xFFDC2626),
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],
                              _label('Email Address'),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _email,
                                keyboardType: TextInputType.emailAddress,
                                decoration: fieldDecoration(
                                  'name@achariya.in',
                                  icon: Icons.mail_outline,
                                ),
                              ),
                              const SizedBox(height: 14),
                              _label('Password'),
                              const SizedBox(height: 6),
                              TextField(
                                controller: _password,
                                obscureText: _obscure,
                                onSubmitted: (_) => _submit(),
                                decoration: fieldDecoration(
                                  'Enter your password',
                                  icon: Icons.lock_outline,
                                  suffix: IconButton(
                                    icon: Icon(
                                      _obscure
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                      size: 20,
                                      color: kSlate400,
                                    ),
                                    onPressed: () =>
                                        setState(() => _obscure = !_obscure),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 22),
                              GradientButton(
                                label: 'Sign In to Workspace',
                                icon: Icons.arrow_forward_rounded,
                                loading: _loading,
                                onPressed: _submit,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Align(
        alignment: Alignment.centerLeft,
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: kSlate700,
          ),
        ),
      );

  Widget _glowBlob(double size, Color color) => IgnorePointer(
        child: Container(
          height: size,
          width: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
          ),
        ),
      );
}
