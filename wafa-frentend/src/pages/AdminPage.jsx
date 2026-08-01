import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, FileText, BookOpen, Trophy, TrendingUp, DollarSign, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard } from '@/components/shared';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const navigate = useNavigate();

  const stats = [
    { label: 'Total Users', value: '2,847', icon: <Users className="w-6 h-6" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Questions', value: '12,459', icon: <FileQuestion className="w-6 h-6" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Modules', value: '45', icon: <BookOpen className="w-6 h-6" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Monthly Revenue', value: '8,420 MAD', icon: <DollarSign className="w-6 h-6" />, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const quickActions = [
    { title: 'Manage Modules', path: '/admin/modules', icon: <BookOpen className="w-6 h-6" /> },
    { title: 'View Reports', path: '/admin/reports', icon: <FileText className="w-6 h-6" /> },
    { title: 'Manage Users', path: '/admin/users', icon: <Users className="w-6 h-6" /> },
    { title: 'Analytics', path: '/admin/analytics', icon: <TrendingUp className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={t('admin:admin_dashboard')}
          description={t('admin:manage_platform')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin:quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-4 justify-start gap-3"
                  onClick={() => navigate(action.path)}
                >
                  {action.icon}
                  {action.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;