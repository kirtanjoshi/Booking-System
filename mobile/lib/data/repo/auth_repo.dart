import 'package:shared_preferences/shared_preferences.dart';
import '../source/api_client.dart';

class AuthRepo {
  Future<Map<String, dynamic>> login(String phoneNumber, String password) async {
    final res = await ApiClient.post('/auth/login', {
      'phoneNumber': phoneNumber,
      'password': password,
    });
    return res as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await ApiClient.get('/auth/me');
    return res as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await ApiClient.post('/auth/logout', {});
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session_cookie');
  }
}
