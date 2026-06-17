# Git: порожні коміти в IntelliJ IDEA

## Чому так

IntelliJ створив **порожню** папку `.git` (0 файлів). Тому:

- гілка `<unknown>`;
- Commit порожній;
- push не працює.

**Код уже в Git** — 4 коміти на гілці `main` у резервній копії `C:\temp\schedule3d-git`.

## Виправлення

### Крок 1 — закрити IntelliJ

**File → Exit** (або закрити всі вікна IDEA).  
Поки IDEA відкрита, `.git` **заблокована** і скрипт не спрацює.

### Крок 2 — запустити fix-git

У Провіднику Windows: подвійний клік **`fix-git.bat`** у папці `schedule-3d`.

Або PowerShell:

```powershell
cd "D:\...\schedule-3d"
powershell -ExecutionPolicy Bypass -File scripts\fix-git.ps1
```

### Крок 3 — відкрити проєкт знову

**Git → Log** — має бути гілка **main**, 4 коміти, файли проєкту.

### Крок 4 — push

```powershell
git remote add origin https://github.com/USER/REPO.git
git push -u origin main
```

## Якщо IDEA не закривається

Термінал у папці `schedule-3d`:

```powershell
.\git.ps1 status
.\git.ps1 remote add origin https://github.com/USER/REPO.git
.\git.ps1 push -u origin main
```

## Не натискайте в IDEA

**VCS → Enable Version Control → Git** — знову створить **порожній** репозиторій.
