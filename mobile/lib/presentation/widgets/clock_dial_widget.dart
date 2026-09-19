import 'dart:math';
import 'package:flutter/material.dart';
import '../../data/models/availability_rule.dart';
import '../../base/theme/app_theme.dart';

class ClockDialWidget extends StatelessWidget {
  final List<AvailabilityRule> rules;
  final double size;

  const ClockDialWidget({
    super.key,
    required this.rules,
    this.size = 220,
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
            painter: _ClockDialPainter(rules: rules),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.access_time, color: AppTheme.warmBrass, size: 16),
              const SizedBox(height: 2),
              const Text(
                '24H DIAL',
                style: TextStyle(
                  color: AppTheme.warmBrass,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                '${rules.length} block${rules.length != 1 ? 's' : ''}',
                style: const TextStyle(color: AppTheme.textDim, fontSize: 8),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClockDialPainter extends CustomPainter {
  final List<AvailabilityRule> rules;

  _ClockDialPainter({required this.rules});

  double _timeToAngle(String timeStr) {
    final parts = timeStr.split(':');
    final h = int.parse(parts[0]);
    final m = parts.length > 1 ? int.parse(parts[1]) : 0;
    final totalMinutes = h * 60 + m;
    // 0 minutes = -pi/2 (top)
    return (totalMinutes / 1440.0) * 2 * pi - (pi / 2);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 18;

    // Background track ring
    final bgPaint = Paint()
      ..color = AppTheme.midnightBg
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12;
    canvas.drawCircle(center, radius, bgPaint);

    // Hairline outline
    final hairlinePaint = Paint()
      ..color = AppTheme.hairlineBorder
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawCircle(center, radius + 10, hairlinePaint);
    canvas.drawCircle(center, radius - 16, hairlinePaint);

    // 24 Hour ticks
    final tickPaint = Paint()
      ..color = AppTheme.warmBrass.withValues(alpha: 0.4)
      ..strokeWidth = 1;

    for (int h = 0; h < 24; h++) {
      final angle = (h / 24.0) * 2 * pi - (pi / 2);
      final isMajor = h % 6 == 0;
      final outerR = radius + 6;
      final innerR = isMajor ? radius - 8 : radius - 4;

      final p1 = Offset(center.dx + innerR * cos(angle), center.dy + innerR * sin(angle));
      final p2 = Offset(center.dx + outerR * cos(angle), center.dy + outerR * sin(angle));
      canvas.drawLine(p1, p2, tickPaint);
    }

    // Active availability blocks (Warm brass arcs)
    final arcPaint = Paint()
      ..color = AppTheme.warmBrass
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 12;

    for (final rule in rules) {
      final startAngle = _timeToAngle(rule.startTime);
      var endAngle = _timeToAngle(rule.endTime);
      var sweepAngle = endAngle - startAngle;
      if (sweepAngle < 0) sweepAngle += 2 * pi;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        arcPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ClockDialPainter oldDelegate) => true;
}
