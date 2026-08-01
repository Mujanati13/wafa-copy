import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";
import {
  Download,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  TrendingUp,
  Activity,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Eye,
  Crown,
} from "lucide-react";
import NewUserForm from "./NewUserForm";

const UsersComponent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  // Extended sample user data for pagination demonstration
  const users = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      plan: "Premium",
      status: "Active",
      exams: 12,
      registerDate: "2024-01-20",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael.chen@email.com",
      phone: "+1 (555) 234-5678",
      plan: "Basic",
      status: "Active",
      exams: 8,
      registerDate: "2024-01-19",
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      phone: "+1 (555) 345-6789",
      plan: "Enterprise",
      status: "Inactive",
      exams: 25,
      registerDate: "2024-01-05",
    },
    {
      id: 4,
      name: "James Wilson",
      email: "james.wilson@email.com",
      phone: "+1 (555) 456-7890",
      plan: "Premium",
      status: "Active",
      exams: 15,
      registerDate: "2024-01-20",
    },
    {
      id: 5,
      name: "Dr. Lisa Park",
      email: "lisa.park@email.com",
      phone: "+1 (555) 567-8901",
      plan: "Basic",
      status: "Suspended",
      exams: 6,
      registerDate: "2024-01-18",
    },
    {
      id: 6,
      name: "Alex Thompson",
      email: "alex.thompson@email.com",
      phone: "+1 (555) 678-9012",
      plan: "Premium",
      status: "Active",
      exams: 18,
      registerDate: "2024-01-21",
    },
    {
      id: 7,
      name: "Dr. Maria Garcia",
      email: "maria.garcia@email.com",
      phone: "+1 (555) 789-0123",
      plan: "Enterprise",
      status: "Active",
      exams: 30,
      registerDate: "2024-01-22",
    },
    {
      id: 8,
      name: "David Kim",
      email: "david.kim@email.com",
      phone: "+1 (555) 890-1234",
      plan: "Basic",
      status: "Inactive",
      exams: 4,
      registerDate: "2024-01-10",
    },
    {
      id: 9,
      name: "Dr. Robert Brown",
      email: "robert.brown@email.com",
      phone: "+1 (555) 901-2345",
      plan: "Premium",
      status: "Active",
      exams: 22,
      registerDate: "2024-01-23",
    },
    {
      id: 10,
      name: "Jennifer Lee",
      email: "jennifer.lee@email.com",
      phone: "+1 (555) 012-3456",
      plan: "Basic",
      status: "Suspended",
      exams: 9,
      registerDate: "2024-01-15",
    },
  ];

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case "Premium":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Basic":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Enterprise":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-border";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "Inactive":
        return "bg-gray-100 text-gray-800 border-border";
      case "Suspended":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-border";
    }
  };

  // Calculate analytics data
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const premiumUsers = users.filter((user) => user.plan === "Premium").length;
  const enterpriseUsers = users.filter(
    (user) => user.plan === "Enterprise"
  ).length;
  const inactiveUsers = users.filter(
    (user) => user.status === "Inactive"
  ).length;
  const suspendedUsers = users.filter(
    (user) => user.status === "Suspended"
  ).length;

  // Calculate growth percentages (mock data)
  const userGrowth = 12.5;
  const activeGrowth = 8.2;
  const premiumGrowth = 15.7;
  const enterpriseGrowth = 22.3;

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="min-w-[40px]"
        >
          {i}
        </Button>
      );
    }

    // Next button
    buttons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    );

    return buttons;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts, subscriptions, and access
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              size="sm"
              className="bg-black text-white hover:bg-gray-800"
              onClick={() => setShowNewUserForm(!showNewUserForm)}
            >
              <UserPlus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalUsers}
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">
                      +{userGrowth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      from last month
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {activeUsers}
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">
                      +{activeGrowth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      from last month
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Premium Users
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {premiumUsers}
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">
                      +{premiumGrowth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      from last month
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Basic Users
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {users.filter((user) => user.plan === "Basic").length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(
                      (users.filter((user) => user.plan === "Basic").length /
                        totalUsers) *
                      100
                    ).toFixed(1)}
                    % of total
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Directory Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">User Directory</CardTitle>
            <CardDescription>
              Search and filter through all platform users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button variant="outline" className="sm:w-auto">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* All Users Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              All Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription>
              Complete list of platform users with their details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      Plan
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      Status
                    </th>

                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      Register Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-accent transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-muted-foreground font-medium text-sm">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">
                              {user.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="text-gray-400 flex-shrink-0 w-3.5 h-3.5" />
                            <span className="text-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="text-gray-400 flex-shrink-0 w-3.5 h-3.5" />
                            <span className="text-foreground">{user.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            getPlanBadgeColor(user.plan)
                          )}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            getStatusBadgeColor(user.status)
                          )}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-gray-400 flex-shrink-0 w-3.5 h-3.5" />
                          <span className="text-foreground">
                            {user.registerDate}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-400 hover:text-muted-foreground transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t bg-background/50">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredUsers.length)} of{" "}
                {filteredUsers.length} results
              </div>
              <div className="flex items-center gap-2">
                {renderPaginationButtons()}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
      {showNewUserForm && (
        <NewUserForm setShowNewUserForm={setShowNewUserForm} />
      )}
    </div>
  );
};

export default UsersComponent;
