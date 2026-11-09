import 'package:flutter_test/flutter_test.dart';
import 'package:digital_crm/main.dart';

void main() {
  testWidgets('App shows animated splash screen then transitions to login', (WidgetTester tester) async {
    await tester.pumpWidget(const DigitalCrmApp());
    expect(find.text('Digiventures'), findsWidgets);
    expect(find.text('CREATIVE WORKFLOW OS'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.text('Sign In to Workspace'), findsOneWidget);
  });
}
