import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../base/theme/app_theme.dart';
import '../../provider/client_provider.dart';

class ClientsPage extends StatefulWidget {
  const ClientsPage({super.key});

  @override
  State<ClientsPage> createState() => _ClientsPageState();
}

class _ClientsPageState extends State<ClientsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ClientProvider>().loadClients();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ClientProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('CLIENT DIRECTORY'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => provider.loadClients(),
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.warmBrass))
          : provider.clients.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.people_outline, size: 48, color: AppTheme.warmBrass.withValues(alpha: 0.5)),
                        const SizedBox(height: 12),
                        const Text(
                          'No clients registered yet',
                          style: TextStyle(color: AppTheme.textLight, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Clients will appear here once they interact with the WhatsApp booking bot.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.textDim, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: provider.clients.length,
                  itemBuilder: (context, index) {
                    final client = provider.clients[index];

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  client.name ?? 'Client',
                                  style: const TextStyle(
                                    color: AppTheme.textLight,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.warmBrass.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: AppTheme.warmBrass.withValues(alpha: 0.3)),
                                  ),
                                  child: Text(
                                    '${client.bookings?.length ?? 0} Sessions',
                                    style: const TextStyle(color: AppTheme.warmBrass, fontSize: 10),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              client.phoneNumber,
                              style: const TextStyle(color: AppTheme.textDim, fontSize: 12),
                            ),
                            const Divider(color: AppTheme.hairlineBorder, height: 18),
                            const Text(
                              'BIRTH CHART PARAMETERS',
                              style: TextStyle(
                                color: AppTheme.warmBrass,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'DOB: ${client.birthDate ?? "Unknown"}',
                                    style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                                  ),
                                ),
                                Expanded(
                                  child: Text(
                                    'Time: ${client.birthTime ?? "Unknown"}',
                                    style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Place: ${client.birthPlace ?? "Unknown"}',
                              style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                            ),
                            if (client.notes != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Notes: "${client.notes}"',
                                style: const TextStyle(color: AppTheme.textDim, fontSize: 11, fontStyle: FontStyle.italic),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
