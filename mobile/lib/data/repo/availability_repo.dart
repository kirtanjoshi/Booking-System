import '../models/availability_rule.dart';
import '../source/api_client.dart';

class AvailabilityRepo {
  Future<List<AvailabilityRule>> getRules() async {
    final res = await ApiClient.get('/availability-rules') as List<dynamic>;
    return res.map((item) => AvailabilityRule.fromJson(item)).toList();
  }

  Future<void> addRule(int dayOfWeek, String startTime, String endTime) async {
    await ApiClient.post('/availability-rules', {
      'dayOfWeek': dayOfWeek,
      'startTime': startTime,
      'endTime': endTime,
      'isActive': true,
    });
  }

  Future<void> deleteRule(String id) async {
    await ApiClient.delete('/availability-rules/$id');
  }
}
