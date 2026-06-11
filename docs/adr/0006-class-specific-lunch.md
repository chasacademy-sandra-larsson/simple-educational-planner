# Klass-specifik lunch (inte gemensam kärnlunch)

Varje klass får sin egen `class_lunch_start`-variabel inom projektets lunchfönster. Olika klasser kan ha lunch vid olika tider — t.ex. klass A 11:30–12:15, klass B 12:15–13:00.

## Considered Options

- **Gemensam kärnlunch** (det gamla beteendet i `scheduler.py`): en enda 45-minutersperiod centrerad i lunchfönstret där *ingen* klass får ha lektion. Avvisades — modellerar en skola där hela elevkåren ska få plats i matsalen samtidigt, vilket är orealistiskt för skolor med fler elever än matsalskapacitet.
- **Explicita lunch-slots med matsalskapacitet**: skolan definierar t.ex. 3 luncher och elever per slot. Skjuts till v2.

## Consequences

- En `class_lunch_start`-variabel per klass + no-overlap mellan klassens lektioner och dess lunchintervall.
- Matsalskapacitet är *inte* modellerad — i extremfall kan solvern lägga alla klassers lunch samtidigt. v2-feature.
- Klass-håltid-objektivet måste hantera lunchen som "OK gap" och inte penalisera den.
