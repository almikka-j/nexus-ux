'use client';

import Image from 'next/image';
import { HomeLoan } from '../home-loan';
import { HomeHero } from '../home-hero';
import { HomeAbout } from '../home-about';
import { HomeNotice } from '../home-notice';
import { HomeAdvantages } from '../home-advantages';
import { HomeTestimonial } from '../home-testimonial';
import { HomeAccreditation } from '../home-accreditation';
import styles from './home-view.module.css';

export function HomeView() {
  return (
    <>
      {/* Floating Image */}
      <div className={styles.floatingImage}>
        <Image
          src="/images/dti.png"
          alt="Floating"
          width={120}
          height={120}
          className={styles.floatingImg}
        />
      </div>

      <HomeHero />
      <HomeTestimonial />
      <HomeLoan />
      <HomeAdvantages />
      <HomeAbout />
      <HomeAccreditation />
      <HomeNotice />
    </>
  );
}
