import os
import re

dir_path = r"c:\Users\fg\Desktop\All 3\WAFA\WAFA - Copy\wafa-frentend\src"
files = [
    "pages/AnayticsPage.jsx",
    "components/admin/UsersWithTabs.jsx",
    "pages/UsersWithTabs.jsx",
    "pages/AdminPage.jsx",
    "pages/ReportQuestionsAdmin.jsx",
    "pages/Explications.jsx",
    "pages/Semesters.jsx",
    "pages/Module.jsx",
    "pages/CategoriesOfModules.jsx",
    "pages/ExamParYears.jsx",
    "pages/ExamCourses.jsx",
    "pages/QCMBanque.jsx",
    "pages/DemandesDePayements.jsx",
    "pages/SubscriptionPage.jsx",
    "pages/SubAdminPage.jsx",
    "pages/AddQuestions.jsx",
    "pages/ImportExamParYears.jsx",
    "pages/ImportExamParCourse.jsx",
    "pages/ImportQCMBanque.jsx",
    "pages/ImportResumes.jsx",
    "pages/ImportImages.jsx",
    "pages/ImportExplications.jsx",
    "pages/GenerateExplanationsAI.jsx",
    "pages/CreateCategoriesForCourses.jsx",
    "pages/NotificationAdmin.jsx",
    "pages/AdminPaypalSettings.jsx",
    "pages/LandingPageAdmin.jsx",
    "pages/FeedbacksAdmin.jsx",
    "pages/PrivacyPolicyAdmin.jsx",
    "pages/ContactMessagesAdmin.jsx",
    "pages/ResumesAdmin.jsx",
    "pages/Leaderboard.jsx"
]

replacements = [
    (r'bg-gradient-to-br\s+from-slate-50\s+to-blue-50', 'bg-background'),
    (r'bg-gradient-to-br\s+from-gray-50\s+to-blue-50', 'bg-background'),
    (r'\bbg-slate-50\b', 'bg-background'),
    (r'\bbg-gray-50\b', 'bg-background'),
    (r'\bbg-white\b', 'bg-card'),
    (r'\btext-slate-900\b', 'text-foreground'),
    (r'\btext-slate-800\b', 'text-foreground'),
    (r'\btext-slate-700\b', 'text-foreground'),
    (r'\btext-gray-900\b', 'text-foreground'),
    (r'\btext-gray-800\b', 'text-foreground'),
    (r'\btext-gray-700\b', 'text-foreground'),
    (r'\btext-slate-600\b', 'text-muted-foreground'),
    (r'\btext-slate-500\b', 'text-muted-foreground'),
    (r'\btext-gray-600\b', 'text-muted-foreground'),
    (r'\btext-gray-500\b', 'text-muted-foreground'),
    (r'\bborder-slate-200\b', 'border-border'),
    (r'\bborder-gray-200\b', 'border-border'),
    (r'\bbg-slate-100\b', 'bg-muted'),
    (r'\bbg-gray-100\b', 'bg-muted'),
]

for file in files:
    path = os.path.normpath(os.path.join(dir_path, file))
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content
        for pattern, repl in replacements:
            new_content = re.sub(pattern, repl, new_content)
            
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")
    else:
        print(f"Not found: {file}")
