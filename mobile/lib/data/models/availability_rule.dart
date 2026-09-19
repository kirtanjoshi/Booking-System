class AvailabilityRule {
  final String id;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final bool isActive;

  AvailabilityRule({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.isActive,
  });

  factory AvailabilityRule.fromJson(Map<String, dynamic> json) {
    return AvailabilityRule(
      id: json['id'] ?? '',
      dayOfWeek: json['dayOfWeek'] ?? 0,
      startTime: json['startTime'] ?? '10:00',
      endTime: json['endTime'] ?? '13:00',
      isActive: json['isActive'] ?? true,
    );
  }
}
