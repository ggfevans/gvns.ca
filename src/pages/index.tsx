import {getAnalytics} from 'firebase/analytics';
import {initializeApp} from 'firebase/app';
import dynamic from 'next/dynamic';
import {FC, memo} from 'react';

import Page from '../components/Layout/Page';
import About from '../components/Sections/About';
import Contact from '../components/Sections/Contact';
import Footer from '../components/Sections/Footer';
import Hero from '../components/Sections/Hero';
import Portfolio from '../components/Sections/Portfolio';
import Resume from '../components/Sections/Resume';
import Testimonials from '../components/Sections/Testimonials';
import {homePageMeta} from '../data/data';

const firebaseConfig = {
  apiKey: 'AIzaSyD-nS9FEMjth4ryab01z-Qndb94br7-8qQ',
  authDomain: 'gvns-ca.firebaseapp.com',
  projectId: 'gvns-ca',
  storageBucket: 'gvns-ca.appspot.com',
  messagingSenderId: '376773105450',
  appId: '1:376773105450:web:ac0e7afad342f68d1ff053',
  measurementId: 'G-8VZMZG93BY',
};

const firebase = initializeApp(firebaseConfig);

export const analytics = typeof window !== 'undefined' ? getAnalytics(firebase) : null;

// eslint-disable-next-line react-memo/require-memo
const Header = dynamic(() => import('../components/Sections/Header'), {ssr: false});

const Home: FC = memo(() => {
  const {title, description} = homePageMeta;
  return (
    <Page description={description} title={title}>
      <Header />
      <Hero />
      <About />
      <Resume />
      <Portfolio />
      <Testimonials />
      <Contact />
      <Footer />
    </Page>
  );
});

export default Home;
