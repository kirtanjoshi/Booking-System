import '../models/client.dart';
import '../source/api_client.dart';

class ClientRepo {
  Future<List<Client>> getClients() async {
    final res = await ApiClient.get('/clients') as List<dynamic>;
    return res.map((item) => Client.fromJson(item)).toList();
  }
}
