import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Calendar from './pages/Calendar';
import Webmail from './pages/Webmail';
import Statistics from './pages/Statistics';
import ScheduleWebinar from './pages/ScheduleWebinar';
import ABTestDashboard from './pages/ABTestDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Campaigns": Campaigns,
    "Leads": Leads,
    "Clients": Clients,
    "Calendar": Calendar,
    "Webmail": Webmail,
    "Statistics": Statistics,
    "ScheduleWebinar": ScheduleWebinar,
    "ABTestDashboard": ABTestDashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};