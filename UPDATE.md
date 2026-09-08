# Update: Kundenlinks und Bilder

## Daten erhalten

Vor dem Einspielen den **Live-Datenordner einschließlich Uploads**, die Serverkonfiguration und den bisherigen Programmstand sichern. Keine lokalen JSON-Dateien über Live-Daten kopieren und den Datenordner nicht beim Deployment löschen. Ein abweichendes `DATA_DIRECTORY` unverändert übernehmen.

`ADMIN_SESSION_SECRET` beziehungsweise `DEMO_PASSWORD`, falls vorhanden, unverändert lassen. Ohne diese Variablen legt die neue Version einmalig `data/application-secret` an (bzw. im konfigurierten Datenordner). Diese Datei dauerhaft erhalten und mitsichern. Sie darf nicht öffentlich abrufbar sein; `.htaccess` im Hauptverzeichnis und `data/.htaccess` mit ausliefern. Bei einem eigenen Datenordner diesen außerhalb des öffentlichen Dokumentenstamms halten.

Die neue dauerhafte Schlüsseldatei kann den flüchtigen Schlüssel einer alten laufenden Version nicht rekonstruieren. Vollständige Vorschlags- und Terminverwaltungslinks, die in gespeicherten ausgehenden E-Mails der Anfrage enthalten sind, werden zusätzlich erkannt. Die Sieben-Tage-Frist gilt trotzdem für Vorschläge; ein explizit erneuerter Vorschlagslink ersetzt den alten. Fehlt der alte Link in den gespeicherten E-Mails, bietet ein ungültiger Vorschlagslink den erneuten Versand an die hinterlegte Kundenadresse an. Nicht mehr gespeicherte Terminverwaltungslinks können dadurch nicht automatisch repariert werden.

## Ausliefern

Backend `app.js` **und `customer-workflows.js`**, `package.json`, `scripts/`, `.htaccess` und die gebauten Website-Dateien gemeinsam ausliefern. `data/.htaccess` ergänzen, ohne andere Dateien im Live-Datenordner zu ersetzen. Bei vorhandenen eigenen Apache-Regeln die Zugriffssperren in die bestehende `.htaccess` übernehmen. `npm run build` erstellt die Website-Dateien. Der normale Neustart aktiviert das Backend.

## Erinnerungen auch bei ruhender Passenger-App

Die laufende App prüft jede Minute, ob ein offener Vorschlagsblock sechs Tage alt ist. Für Hosting, das unbesuchte Apps beendet, in Plesk zusätzlich eine **stündliche geplante Aufgabe** einrichten:

```text
<absoluter Pfad zu node> /<absoluter Anwendungsstamm>/scripts/send-proposal-reminders.js
```

Die Aufgabe als derselbe Hosting-Benutzer ausführen. Bei abweichender Konfiguration dieselben Werte für `PUBLIC_URL`, `DATA_DIRECTORY` und einen explizit konfigurierten Schlüssel bereitstellen. Keine Schlüssel in URLs oder öffentlich sichtbare Logs schreiben. Der Befehl ruft die laufende App authentifiziert auf und weckt sie bei Bedarf; er startet keine zweite Anwendung, die parallel Daten schreibt. Testweise im Anwendungsstamm `npm run reminders` ausführen.

SMTP muss aktiviert und korrekt eingerichtet sein. Erfolgreiche Erinnerungen werden je Block gespeichert und nicht bei jedem Aufruf erneut gesendet. Bei einem SMTP-Fehler erfolgt beim nächsten Lauf ein erneuter Versuch. Wenn die Anwendung bis nach Ablauf der sieben Tage nicht erreichbar war, wird keine verspätete Erinnerung mehr gesendet.

## Verhalten

- Vorschlagslinks gelten sieben Tage ab Versand, bei alten Blöcken ab deren gespeichertem `sentAt`. Erneuter Versand setzt die sieben Tage neu und ersetzt den bisherigen Auswahl-Token. Slots bleiben gleich; vergangene oder gesperrte Slots müssen durch neue Vorschläge ersetzt werden.
- Nach sechs Tagen wird erinnert; nach sieben Tagen sind Buchungen über den Link gesperrt und die Reservierungen freigegeben. Kunden können neue Vorschläge anfordern. Je nach Einstellung werden diese automatisch gesendet oder die Anfrage erscheint erneut als ungelesen mit Status „Neu“. Bei fehlenden freien Slots oder Versandfehlern bleibt die Anfrage zur manuellen Bearbeitung offen.
- Ungültige Links geben keine Kundendaten oder neuen Tokens aus. Der Versand erfolgt nur an die gespeicherte E-Mail-Adresse und ist je Block auf einmal pro 15 Minuten begrenzt.
- „Bilder anfordern“ verschickt einen persönlichen Upload-Link, gültig für 30 Tage und eine Einreichung mit bis zu fünf Bildern. Zustimmung ist serverseitig Pflicht; Bilder werden wie Anfrage-Uploads in WebP umgewandelt und der bestehenden Anfrage zugeordnet.
- „Nachstechen“ verlangt mindestens ein verarbeitetes Bild, aber keine Beschreibung. „Neues Tattoo“ verlangt weiterhin eine Beschreibung.

## Prüfung

`npm test` prüft die bestehenden Admin-/CalDAV-Abläufe sowie Link-Erneuerung, Ablauf, Erinnerungen, SMTP-Fehler, Upload-Zustimmung, Nachstechen, mehrere Abwesenheitszeiträume und das Freigeben von Reservierungen beim Löschen. Vor Live-Nutzung zusätzlich SMTP-Zustellung und die geplante Aufgabe auf dem Hosting prüfen.
