// import { Tab } from "../components/panelComponents/shared/types";
// Removed all missing page imports - only keeping existing pages

export enum PublicRoutes {
  NotFound = "*",
  Login = "/login",
}

export enum Routes {}
// Commented out routes for missing pages
// Add back routes when page components are available

// Games = "/games",
// Feedback = "/feedback",
// Memberships = "/memberships",
// Reservations = "/reservations",
// Rewards = "/rewards",
// Tables = "/tables",
// NewTables = "/new-tables",
// OnlineSales = "/online-sales",
// Visits = "/visits",
// Education = "/education",
// Menu = "/menu",
// MenuPrice = "/menu-price",
// User = "/user/:userId",
// Orders = "/orders",
// Users = "/users",
// Analytics = "/analytics",
// Gameplays = "/gameplays",
// Profile = "/profile",
// Accounting = "/accounting",
// Expenses = "/expenses",
// Stocks = "/stocks",
// Count = "/count/:location/:countListId",
// Check = "/check/:location/:checklistId",
// Product = "/product/:productId",
// Vendor = "/vendor/:vendorId",
// Brand = "/brand/:brandId",
// Service = "/service/:serviceId",
// SingleCountArchive = "/archive/:archiveId",
// SingleCheckArchive = "/check-archive/:archiveId",
// SingleFolderPage = "/folder/:folderName",
// CountLists = "/count-lists",
// CountList = "/count-list/:countListId",
// Checkout = "/checkout",
// PanelControl = "/panel-control",
// PageDetails = "/page-details/:pageDetailsId",
// DisabledConditionActions = "/disabled-condition/:disabledConditionId",
// OrderDatas = "/order-datas",
// UserActivities = "/user-activities",
// OrdersSummary = "/orders-summary",
// Images = "/images",
// BulkProductAdding = "/bulk-product-adding",
// Checklists = "/checklists",
// Checklist = "/checklist/:checklistId",
// ButtonCalls = "/button-calls",
// Notifications = "/notifications",
// Expirations = "/expirations",
// ExpirationList = "/expiration-list/:expirationListId",
// ExpirationCount = "/expiration/:location/:expirationListId",
// SingleExpirationCountArchive = "/expiration-archive/:archiveId",
// Location = "/location/:locationId",
// Activities = "/activities",
// DailySummary = "/daily-summary",
// IkasPickUp = "/ikas-pickup",
// orderCategoryOrder = "/order-category-order",

export const allRoutes: {
  name: string;
  path?: string;
  isOnSidebar: boolean;
  exceptionalRoles?: number[];
  link?: string;
  element?: () => JSX.Element;
  // tabs?: Tab[];
  children?: typeof allRoutes;
}[] = [
  // All page components removed - only keeping basic structure
  // Add back routes when page components are available
];

export const NO_IMAGE_URL =
  "https://res.cloudinary.com/dvbg/image/upload/ar_4:4,c_crop/c_fit,h_100/davinci/no-image_pyet1d.jpg";
