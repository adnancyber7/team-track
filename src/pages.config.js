import DHLSheet from './pages/DHLSheet';
import AdminSettings from './pages/AdminSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DHLSheet": DHLSheet,
    "AdminSettings": AdminSettings,
}

export const pagesConfig = {
    mainPage: "DHLSheet",
    Pages: PAGES,
    Layout: __Layout,
};