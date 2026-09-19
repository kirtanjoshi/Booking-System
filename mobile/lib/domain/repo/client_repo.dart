import '../../data/models/client.dart';

abstract class ClientRepo {
  Future<List<Client>> getClients();
  Future<Client> getClient(String id);
}
