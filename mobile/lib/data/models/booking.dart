import 'client.dart';

class SessionTypeInfo {
  final String id;
  final String name;
  final int durationMinutes;
  final int bufferMinutes;

  SessionTypeInfo({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.bufferMinutes,
  });

  factory SessionTypeInfo.fromJson(Map<String, dynamic> json) {
    return SessionTypeInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      durationMinutes: json['durationMinutes'] ?? 0,
      bufferMinutes: json['bufferMinutes'] ?? 0,
    );
  }
}

class Booking {
  final String id;
  final Client client;
  final SessionTypeInfo sessionType;
  final DateTime scheduledStart;
  final DateTime scheduledEnd;
  final String status;
  final String source;
  final String? cancelledReason;
  final String? notes;
  final List<String> imageUrls;

  Booking({
    required this.id,
    required this.client,
    required this.sessionType,
    required this.scheduledStart,
    required this.scheduledEnd,
    required this.status,
    required this.source,
    this.cancelledReason,
    this.notes,
    this.imageUrls = const [],
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? '',
      client: Client.fromJson(json['client'] ?? {}),
      sessionType: SessionTypeInfo.fromJson(json['sessionType'] ?? {}),
      scheduledStart: DateTime.parse(json['scheduledStart']),
      scheduledEnd: DateTime.parse(json['scheduledEnd']),
      status: json['status'] ?? 'PENDING',
      source: json['source'] ?? 'ADMIN',
      cancelledReason: json['cancelledReason'],
      notes: json['notes'],
      imageUrls: (json['imageUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}
