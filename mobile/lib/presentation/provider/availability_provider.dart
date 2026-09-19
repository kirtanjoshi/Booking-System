import 'package:flutter/material.dart';
import '../../data/models/availability_rule.dart';
import '../../data/repo/availability_repo.dart';

class AvailabilityProvider extends ChangeNotifier {
  final AvailabilityRepo _repo = AvailabilityRepo();
  List<AvailabilityRule> _rules = [];
  bool _isLoading = false;
  int _selectedDay = 1; // Monday by default

  List<AvailabilityRule> get rules => _rules;
  bool get isLoading => _isLoading;
  int get selectedDay => _selectedDay;

  List<AvailabilityRule> get currentDayRules =>
      _rules.where((r) => r.dayOfWeek == _selectedDay && r.isActive).toList();

  Future<void> loadRules() async {
    _isLoading = true;
    notifyListeners();

    try {
      _rules = await _repo.getRules();
    } catch (_) {
      _rules = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectDay(int day) {
    _selectedDay = day;
    notifyListeners();
  }

  Future<void> addBlock(String startTime, String endTime) async {
    await _repo.addRule(_selectedDay, startTime, endTime);
    await loadRules();
  }

  Future<void> removeBlock(String id) async {
    await _repo.deleteRule(id);
    await loadRules();
  }
}
