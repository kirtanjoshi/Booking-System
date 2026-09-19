import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import 'package:home_widget/home_widget.dart';
import 'base/theme/app_theme.dart';
import 'global_provider.dart';
import 'router/app_router.dart';
import 'presentation/provider/auth_provider.dart';
import 'presentation/widgets/status_update_dialog.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Desktop window configuration
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    await windowManager.ensureInitialized();
    const windowOptions = WindowOptions(
      size: Size(1000, 700),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      title: 'Vedic Practice - Astrologer Observatory',
    );
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(
    MultiProvider(
      providers: globalProviders,
      child: const AstrologerApp(),
    ),
  );
}

class AstrologerApp extends StatefulWidget {
  const AstrologerApp({super.key});

  @override
  State<AstrologerApp> createState() => _AstrologerAppState();
}

class _AstrologerAppState extends State<AstrologerApp> {
  @override
  void initState() {
    super.initState();
    _checkHomeWidgetLaunch();
  }

  // Handle widget one-tap status update action on mobile
  void _checkHomeWidgetLaunch() {
    // home_widget only supports Android and iOS; guard for desktop/web
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      return;
    }

    try {
      HomeWidget.initiallyLaunchedFromHomeWidget().then((uri) {
        if (uri != null && uri.host == 'status_update') {
          _openStatusUpdateFlow();
        }
      }).catchError((_) {
        // Gracefully ignore if plugin channel is not registered
      });

      HomeWidget.widgetClicked.listen((uri) {
        if (uri != null && uri.host == 'status_update') {
          _openStatusUpdateFlow();
        }
      }, onError: (_) {
        // Gracefully ignore stream errors on unsupported platforms
      });
    } catch (_) {
      // Graceful fallback
    }
  }

  void _openStatusUpdateFlow() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = AppRouter.rootNavigatorKey.currentContext;
      if (context != null) {
        showDialog(
          context: context,
          builder: (_) => const StatusUpdateDialog(),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final router = AppRouter.createRouter(auth);

    return MaterialApp.router(
      title: 'Aura Practice',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
