import '../../data/models/availability_rule.dart';

abstract class AvailabilityRepo {
  Future<List<AvailabilityRule>> getAvailability(String adminId);
  Future<AvailabilityRule> createRule(String adminId, int dayOfWeek, String startTime, String endTime);
  Future<void> deleteRule(String ruleId);
}
