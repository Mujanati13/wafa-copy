import os
import re

files_to_update = [
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\Dashboard.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\StatisticsPage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\LeaderboardClient.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\ClientSubscriptionPage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\ProfilePage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\SettingsPage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\PlaylistsPage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\NotesPage.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\pages\Myplaylist.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\Dashboard\ModuleCard.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\Dashboard\ModulePreviewModal.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\ModuleStatsCard.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\ModulePopup.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\ContentWarningModal.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\TableFilters.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\DataTable.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\shared\StatCard.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\FloatingSupport.jsx",
    r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src\components\OfferCountdown.jsx"
]

replacements = {
    r'\bbg-white\b': 'bg-background',
    r'\bbg-slate-50\b': 'bg-card',
    r'\bbg-gradient-to-br from-slate-50 to-blue-50\b': 'bg-gradient-to-br from-background to-muted',
    r'\bbg-gradient-to-br from-slate-50 via-gray-50 to-slate-100\b': 'bg-gradient-to-br from-background via-muted to-card',
    r'\bbg-gradient-to-br from-slate-50 via-blue-50 to-slate-100\b': 'bg-gradient-to-br from-background via-muted to-card',
    r'\btext-slate-900\b': 'text-foreground',
    r'\btext-slate-800\b': 'text-foreground',
    r'\btext-slate-700\b': 'text-muted-foreground',
    r'\btext-slate-600\b': 'text-muted-foreground',
    r'\btext-slate-500\b': 'text-muted-foreground',
    r'\bborder-slate-200\b': 'border-border',
    r'\bborder-slate-100\b': 'border-border',
    r'\bbg-slate-100\b': 'bg-muted',
    r'\bhover:bg-slate-100\b': 'hover:bg-accent',
    r'\bhover:bg-slate-50\b': 'hover:bg-accent',
    r'\btext-gray-900\b': 'text-foreground',
    r'\btext-gray-800\b': 'text-foreground',
    r'\btext-gray-700\b': 'text-muted-foreground',
    r'\btext-gray-600\b': 'text-muted-foreground',
    r'\bbg-gray-50\b': 'bg-card',
    r'\bbg-gray-100\b': 'bg-muted',
    r'\bborder-gray-200\b': 'border-border',
}

for file_path in files_to_update:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"No changes for {file_path}")
