// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import "./Slideshow.css";

// import required modules
import { Navigation, Pagination } from "swiper/modules";
import { Page0 } from "./Page0";
import { Page1 } from "./Page1";
import { Page2 } from "./Page2";

export const Slideshow = () => {
  return (
    <div className="c-slideshow">
      <Swiper
        navigation={true}
        pagination={true}
        modules={[Navigation, Pagination]}
        className="mySwiper"
      >
        <SwiperSlide>
          <Page0 />
        </SwiperSlide>
        <SwiperSlide>
          <Page1 />
        </SwiperSlide>
        <SwiperSlide>
          <Page2 />
        </SwiperSlide>
        <SwiperSlide>Slide 4</SwiperSlide>
        <SwiperSlide>Slide 5</SwiperSlide>
        <SwiperSlide>Slide 6</SwiperSlide>
        <SwiperSlide>Slide 7</SwiperSlide>
        <SwiperSlide>Slide 8</SwiperSlide>
        <SwiperSlide>Slide 9</SwiperSlide>
      </Swiper>
    </div>
  );
};
