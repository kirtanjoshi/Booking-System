import 'package:flutter/material.dart';

class AppTheme {
  // Light SaaS Palette (Flagship)
  static const Color canvasBg = Color(0xFFF4F5F9);
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color primaryBlue = Color(0xFF2563EB);
  static const Color primaryHover = Color(0xFF1D4ED8);
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color cardShadow = Color(0x08000000);

  // Status Pill Badges
  static const Color badgeConfirmedBg = Color(0xFFDCFCE7);
  static const Color badgeConfirmedText = Color(0xFF15803D);
  static const Color badgePendingBg = Color(0xFFFEF9C3);
  static const Color badgePendingText = Color(0xFFA16207);
  static const Color badgeCancelledBg = Color(0xFFFEE2E2);
  static const Color badgeCancelledText = Color(0xFFB91C1C);

  // Legacy compatibility tokens re-mapped to Modern Light SaaS palette
  static const Color warmBrass = primaryBlue;
  static const Color brassLight = Color(0xFF60A5FA);
  static const Color textLight = textDark;
  static const Color textDim = textMuted;
  static const Color hairlineBorder = borderLight;
  static const Color surfaceInk = pureWhite;
  static const Color cardSurface = pureWhite;
  static const Color midnightBg = canvasBg;

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: canvasBg,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: primaryHover,
        surface: pureWhite,
        onSurface: textDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: pureWhite,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textDark,
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: textDark),
      ),
      cardTheme: CardThemeData(
        color: pureWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: borderLight, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textDark,
          side: const BorderSide(color: borderLight),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: pureWhite,
        labelStyle: const TextStyle(color: textMuted, fontSize: 13, fontWeight: FontWeight.w500),
        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primaryBlue, width: 1.5),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: pureWhite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderLight),
        ),
      ),
    );
  }

  static ThemeData get darkTheme => lightTheme;
}

