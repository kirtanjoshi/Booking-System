class Client {
  final String id;
  final String phoneNumber;
  final String? name;
  final String? birthDate;
  final String? birthTime;
  final String? birthPlace;
  final String? notes;
  final List<dynamic>? bookings;

  Client({
    required this.id,
    required this.phoneNumber,
    this.name,
    this.birthDate,
    this.birthTime,
    this.birthPlace,
    this.notes,
    this.bookings,
  });

  factory Client.fromJson(Map<String, dynamic> json) {
    return Client(
      id: json['id'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      name: json['name'],
      birthDate: json['birthDate'],
      birthTime: json['birthTime'],
      birthPlace: json['birthPlace'],
      notes: json['notes'],
      bookings: json['bookings'],
    );
  }
}
