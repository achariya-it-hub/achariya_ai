import 'package:flutter/material.dart';
import 'home.dart';
import 'login.dart';
import 'models.dart';
import 'splash.dart';
import 'theme.dart';

void main() {
  runApp(const DigitalCrmApp());
}

class DigitalCrmApp extends StatefulWidget {
  const DigitalCrmApp({super.key});

  @override
  State<DigitalCrmApp> createState() => _DigitalCrmAppState();
}

class _DigitalCrmAppState extends State<DigitalCrmApp> {
  bool _showSplash = true;
  User? _user;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Digiventures · Creative Workflow OS',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: AnimatedSwitcher(
        duration: const Duration(milliseconds: 550),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: _showSplash
            ? SplashScreen(
                key: const ValueKey('splash'),
                onFinished: () => setState(() => _showSplash = false),
              )
            : _user == null
                ? LoginPage(
                    key: const ValueKey('login'),
                    onSignedIn: (u) => setState(() => _user = u),
                  )
                : HomeShell(
                    key: const ValueKey('home'),
                    user: _user!,
                    onSignedOut: () => setState(() => _user = null),
                  ),
      ),
    );
  }
}
