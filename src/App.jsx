import React from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Signup from './SignUp'
import LandingPage from './LandingPage'
import Login from './login'
import Dashboard from './Dashboard'
import Logout from './Logout'
import PrivateRoute from './PrivateRoute'
import Profile from './Profile'
import Messages from './Messages'
import FAQ from './FAQ'
import Notifications from './Notifications'
import Reports from './Reports'
import Editing from './Editing'
import Privacy from './Privacy'
import Contact from './Contact'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Support from './Support'
import Terms from './Terms'
import VerifyEmail from './VerifyEmail'
import Username from './Username'
import Settings from './Settings'
import Blog from './Blog'
import Airtime from './Airtime'
import WebhookMonitor from './WebhookMonitor'
import Data from './Data'
import Transfer from './Transfer'
import BillPay from './BillPayment'
import Kyc from './Kyc'
import CardManagement from './CardManagement'
import TransactionHistory from './TransactionHistory'
import VirtualCard from './VirtualCard'
import VirtualAccount from './VirtualAccount'
import Disbursement from './Disbursement'
import PaymentLink from './PaymentLink'
import Customercare from './Customercare'
import Poscontroller from './PoscontrollerNew.jsx'
import Exchange from './exchange'
import Opayintegration from './Opayintegration'
import PaymentOption from './paymentoption'
import OneTimeAccount from './onetimeaccount'

const App = () => {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/login' element={<Login />} />
        <Route path='/dashboard' element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path='/logout' element={<Logout />} />
        <Route path='/profile' element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path='/messages' element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path='/faq' element={<FAQ />} />
        <Route path='/notifications' element={<Notifications />} />
        <Route path='/reports' element={<Reports />} />
        <Route path='/editing' element={<Editing />} />
        <Route path='/privacy' element={<Privacy />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/support' element={<Support />} />
        <Route path='/terms' element={<Terms />} />
        <Route path='/verify-email' element={<VerifyEmail />} />
        <Route path='/username' element={<Username />} />
        <Route path='/settings' element={<Settings />} />
        <Route path='/blog' element={<Blog />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/airtime' element={<Airtime />} />
        <Route path='/webhook-monitor' element={<PrivateRoute><WebhookMonitor /></PrivateRoute>} />
        <Route path='/data' element={<Data />} />
        <Route path='/transfer' element={<Transfer />} />
        <Route path='/bill-pay' element={<BillPay />} />
        <Route path='/kyc' element={<Kyc />} />
        <Route path='/card-management' element={<CardManagement />} />
        <Route path='/transaction-history' element={<TransactionHistory />} />
        <Route path='/virtual-card' element={<VirtualCard />} />
        <Route path='/virtual-account' element={<VirtualAccount />} />
        <Route path='/disbursement' element={<Disbursement />} />
        <Route path='/payment-link' element={<PaymentLink />} />
        <Route path='/customer-care' element={<Customercare />} />
        <Route path='/pos-controller' element={<Poscontroller />} />
        <Route path='/exchange' element={<Exchange />} />
        <Route path='/opay-integration' element={<Opayintegration />} />
        <Route path='/payment-option' element={<PaymentOption />} />
        <Route path='/one-time-account' element={<OneTimeAccount />} />
        <Route path='*' element={<LandingPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
        

        