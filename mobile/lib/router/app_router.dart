import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../base/theme/app_theme.dart';
import '../navigation/app_router_path.dart';
import '../presentation/UI/auth/login_page.dart';
import '../presentation/UI/main_shell.dart';
import '../presentation/UI/desktop/desktop_mini_widget.dart';
import '../presentation/provider/auth_provider.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> rootNavigatorKey =
      GlobalKey<NavigatorState>(debugLabel: 'root');

  static GoRouter createRouter(AuthProvider authProvider) {
    return GoRouter(
      navigatorKey: rootNavigatorKey,
      initialLocation: AppRouterPath.initial,
      refreshListenable: authProvider,
      redirect: (context, state) {
        if (authProvider.isLoading) return null;

        final isLoggedIn = authProvider.isAuthenticated;
        final isLoggingIn = state.matchedLocation == AppRouterPath.login;

        if (!isLoggedIn && !isLoggingIn) {
          return AppRouterPath.login;
        }

        if (isLoggedIn && isLoggingIn) {
          return AppRouterPath.initial;
        }

        return null;
      },
      routes: [
        GoRoute(
          path: AppRouterPath.initial,
          builder: (context, state) {
            if (authProvider.isLoading) {
              return const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(color: AppTheme.warmBrass),
                ),
              );
            }
            return const MainShell();
          },
        ),
        GoRoute(
          path: AppRouterPath.login,
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: AppRouterPath.desktopMini,
          builder: (context, state) => DesktopMiniWidget(
            onExpandToFull: () {
              context.go(AppRouterPath.initial);
            },
          ),
        ),
      ],
      errorBuilder: (context, state) => Scaffold(
        body: Center(
          child: Text('Page not found: ${state.uri.path}'),
        ),
      ),
    );
  }
}
