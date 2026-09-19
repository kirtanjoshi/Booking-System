import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';
import 'presentation/provider/auth_provider.dart';
import 'presentation/provider/booking_provider.dart';
import 'presentation/provider/availability_provider.dart';
import 'presentation/provider/client_provider.dart';

List<SingleChildWidget> get globalProviders => [
  ChangeNotifierProvider(create: (_) => AuthProvider()),
  ChangeNotifierProvider(create: (_) => BookingProvider()),
  ChangeNotifierProvider(create: (_) => AvailabilityProvider()),
  ChangeNotifierProvider(create: (_) => ClientProvider()),
];
