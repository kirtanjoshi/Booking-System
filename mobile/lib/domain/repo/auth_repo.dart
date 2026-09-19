abstract class AuthRepo {
  Future<Map<String, dynamic>> login(String phoneNumber, String password);
  Future<Map<String, dynamic>> getMe();
  Future<void> logout();
}
