import 'package:flutter/material.dart';
import '../../data/models/client.dart';
import '../../data/repo/client_repo.dart';

class ClientProvider extends ChangeNotifier {
  final ClientRepo _repo = ClientRepo();
  List<Client> _clients = [];
  bool _isLoading = false;

  List<Client> get clients => _clients;
  bool get isLoading => _isLoading;

  Future<void> loadClients() async {
    _isLoading = true;
    notifyListeners();

    try {
      _clients = await _repo.getClients();
    } catch (_) {
      _clients = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
