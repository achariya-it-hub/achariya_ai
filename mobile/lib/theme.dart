import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const Color kIndigo = Color(0xFF4F46E5);
const Color kPurple = Color(0xFF9333EA);
const Color kPink = Color(0xFFEC4899);
const Color kPurpleLight = Color(0xFFA855F7);
const Color kNavy = Color(0xFF1A3A5C);
const Color kRose = Color(0xFFF43F5E);

const Color kSlate50 = Color(0xFFF8FAFC);
const Color kSlate100 = Color(0xFFF1F5F9);
const Color kSlate200 = Color(0xFFE2E8F0);
const Color kSlate300 = Color(0xFFCBD5E1);
const Color kSlate400 = Color(0xFF94A3B8);
const Color kSlate500 = Color(0xFF64748B);
const Color kSlate600 = Color(0xFF475569);
const Color kSlate700 = Color(0xFF334155);
const Color kSlate800 = Color(0xFF1E293B);
const Color kSlate900 = Color(0xFF0F172A);

const List<Color> kBrandColors = [kIndigo, kPurple, kPink];

const LinearGradient kBrandGradient = LinearGradient(
  colors: kBrandColors,
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const LinearGradient kBrandGradientV = LinearGradient(
  colors: kBrandColors,
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
);

const LinearGradient kLoginBgGradient = LinearGradient(
  colors: [Color(0xFFEEF2FF), Color(0xFFF8FAFC), Color(0xFFFDF2F8)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const List<Color> kChartColors = [
  Color(0xFFF43F5E),
  Color(0xFFF59E0B),
  Color(0xFF14B8A6),
  Color(0xFF6366F1),
  Color(0xFFFACC15),
];

InputDecoration fieldDecoration(
  String hint, {
  IconData? icon,
  Widget? suffix,
}) {
  return InputDecoration(
    hintText: hint,
    prefixIcon: icon != null ? Icon(icon, size: 19, color: kSlate400) : null,
    suffixIcon: suffix,
    filled: true,
    fillColor: kSlate100.withValues(alpha: 0.75),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: kSlate200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: kSlate200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: kIndigo, width: 1.8),
    ),
    hintStyle: const TextStyle(color: kSlate400, fontSize: 13),
  );
}

TextTheme _text(bool dark) => GoogleFonts.lexendDecaTextTheme(
      const TextTheme(
        displayLarge: TextStyle(fontWeight: FontWeight.w800),
        displayMedium: TextStyle(fontWeight: FontWeight.w800),
        headlineMedium: TextStyle(fontWeight: FontWeight.w700),
        titleLarge: TextStyle(fontWeight: FontWeight.w700),
        titleMedium: TextStyle(fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(fontWeight: FontWeight.w400),
        bodyMedium: TextStyle(fontWeight: FontWeight.w400),
      ),
    );

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: kSlate50,
    fontFamily: GoogleFonts.lexendDeca().fontFamily,
    colorScheme: const ColorScheme.light(
      primary: kIndigo,
      secondary: kPurple,
      surface: Colors.white,
      onSurface: kSlate900,
    ),
    textTheme: _text(false),
  );

  return base.copyWith(
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSlate100,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kIndigo, width: 2),
      ),
      labelStyle: const TextStyle(color: kSlate600),
      hintStyle: const TextStyle(color: kSlate500),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        backgroundColor: kIndigo,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
  );
}
