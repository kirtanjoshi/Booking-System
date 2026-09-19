import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static String get baseUrl {
    if (kIsWeb || Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
      return 'http://localhost:3001';
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2:3001';
    }
    return 'http://localhost:3001';
  }

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final cookie = prefs.getString('session_cookie');

    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (cookie != null) {
      headers['Cookie'] = cookie;
    }

    return headers;
  }

  static Future<void> _saveCookie(http.Response response) async {
    final rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      final prefs = await SharedPreferences.getInstance();
      final match = RegExp(r'(connect\.sid=[^;]+)').firstMatch(rawCookie);
      if (match != null) {
        await prefs.setString('session_cookie', match.group(1)!);
      } else {
        await prefs.setString('session_cookie', rawCookie);
      }
    }
  }

  static Future<dynamic> get(String endpoint) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.get(url, headers: headers);
    await _saveCookie(response);

    if (response.statusCode == 401) {
      throw Exception('UNAUTHORIZED');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }

    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Request failed');
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.post(url, headers: headers, body: jsonEncode(body));
    await _saveCookie(response);

    if (response.statusCode == 401) {
      throw Exception('UNAUTHORIZED');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }

    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Request failed');
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.patch(url, headers: headers, body: jsonEncode(body));
    await _saveCookie(response);

    if (response.statusCode == 401) {
      throw Exception('UNAUTHORIZED');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }

    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Request failed');
  }

  static Future<dynamic> delete(String endpoint) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.delete(url, headers: headers);
    await _saveCookie(response);

    if (response.statusCode == 401) {
      throw Exception('UNAUTHORIZED');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }

    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Request failed');
  }
}
