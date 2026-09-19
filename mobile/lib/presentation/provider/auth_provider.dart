import 'package:flutter/material.dart';
import '../../data/repo/auth_repo.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepo _authRepo = AuthRepo();
  bool _isLoading = true;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _admin;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get admin => _admin;

  AuthProvider() {
    checkAuth();
  }

  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _authRepo.getMe();
      _admin = res;
      _isAuthenticated = true;
    } catch (_) {
      _isAuthenticated = false;
      _admin = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String phoneNumber, String password) async {
    final res = await _authRepo.login(phoneNumber, password);
    _admin = res['admin'];
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> logout() async {
    await _authRepo.logout();
    _isAuthenticated = false;
    _admin = null;
    notifyListeners();
  }
}
