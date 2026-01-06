import AdminSettings from './pages/AdminSettings';
import DHLSheet from './pages/DHLSheet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminSettings": AdminSettings,
    "DHLSheet": DHLSheet,
}

export const pagesConfig = {
    mainPage: "DHLSheet",
    Pages: PAGES,
    Layout: __Layout,
};