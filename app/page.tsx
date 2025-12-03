import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Globe, Sparkles, Lock } from 'lucide-react';
import { FreeTrial } from '@/components/landing/FreeTrial';
import { Pro } from '@/components/landing/Pro';

/**
 * Landing page for the TowerOfBabel application.
 * Pixel-perfect clone of the reference design with cultural communication value proposition.
 */
export default function Home(): JSX.Element {
  const flags = [
    {
      emoji: (
        <svg width="36" height="27" viewBox="0 0 36 27" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="27" fill="#F5F8FB" />
          <rect width="11.25" height="27" fill="#2E4E9D" />
          <rect x="24.75" width="11.25" height="27" fill="#DC251C" />
        </svg>
      ),
      name: 'French',
      position: 'top-[15%] left-[8%]',
    },
    {
      emoji: (
        <svg width="36" height="27" viewBox="0 0 36 27" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H36V27H0V0Z" fill="#2E4E9D" />
          <path
            d="M36 23.4844L22.6875 13.5L36 3.51563V0H31.3125L18 9.9844L4.6875 0H0V3.51562L13.3125 13.5L0 23.4844V27H4.68756L18 17.0157L31.3124 27H36V23.4844Z"
            fill="white"
          />
          <path
            d="M1.875 0L18 12.0938L34.125 0H36V1.40527L19.875 13.5L36 25.5928V27H34.126L18 14.9062L1.87402 27H0V25.5928L16.125 13.5L0 1.40527V0H1.875Z"
            fill="#DC251C"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.5 9V0H22.5V9H36V18H22.5V27H13.5V18H0V9H13.5Z"
            fill="white"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15.75 11.25V0H20.25V11.25H36V15.75H20.25V27H15.75V15.75H0V11.25H15.75Z"
            fill="#DC251C"
          />
        </svg>
      ),
      name: 'British',
      position: 'top-[25%] left-[12%]',
    },
    {
      emoji: (
        <svg width="54" height="40" viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_2193_3683)">
            <rect width="53.3333" height="40" fill="#272727" />
            <rect y="13.333" width="53.3333" height="13.3333" fill="#DC251C" />
            <rect y="26.667" width="53.3333" height="13.3333" fill="#FFD018" />
          </g>
          <defs>
            <clipPath id="clip0_2193_3683">
              <rect width="53.3333" height="40" rx="3.33333" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      name: 'German',
      position: 'top-[45%] left-[10%]',
    },
    {
      emoji: (
        <svg width="59" height="44" viewBox="0 0 59 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="58.6667" height="44" rx="2.93333" fill="#2B9F5A" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M29.3333 5.5L5.49997 22L29.3333 38.5L53.1666 22L29.3333 5.5Z"
            fill="#FFD018"
          />
          <path
            d="M40.3334 22C40.3334 28.0751 35.4086 33 29.3334 33C23.2583 33 18.3334 28.0751 18.3334 22C18.3334 15.9249 23.2583 11 29.3334 11C35.4086 11 40.3334 15.9249 40.3334 22Z"
            fill="#41479B"
          />
          <mask
            id="mask0_2193_3442"
            style={{ maskType: 'alpha' }}
            maskUnits="userSpaceOnUse"
            x="18"
            y="11"
            width="23"
            height="22"
          >
            <path
              d="M40.3334 22C40.3334 28.0751 35.4086 33 29.3334 33C23.2583 33 18.3334 28.0751 18.3334 22C18.3334 15.9249 23.2583 11 29.3334 11C35.4086 11 40.3334 15.9249 40.3334 22Z"
              fill="#41479B"
            />
          </mask>
          <g mask="url(#mask0_2193_3442)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M16.6506 19.6997L16.5001 18.333C16.3492 16.9663 16.3495 16.9663 16.3498 16.9662L16.3587 16.9653L16.3802 16.963L16.4579 16.955C16.5249 16.9484 16.6219 16.9391 16.7464 16.9281C16.9954 16.9062 17.3547 16.8775 17.8046 16.8497C18.7035 16.7941 19.9679 16.7417 21.4383 16.7537C24.3574 16.7774 28.1801 17.0547 31.5772 18.1174C34.9508 19.1726 37.8217 20.804 39.8396 22.1592C40.8518 22.839 41.6577 23.455 42.2141 23.9043C42.4925 24.129 42.709 24.3125 42.8582 24.4419C42.9328 24.5066 42.9906 24.5579 43.031 24.594L43.0784 24.6368L43.0922 24.6494L43.0965 24.6534C43.0968 24.6536 43.0992 24.6558 42.1667 25.6663C41.2342 26.6768 41.2345 26.677 41.2347 26.6772L41.2283 26.6714L41.1964 26.6426C41.1665 26.6158 41.1196 26.5742 41.0563 26.5194C40.9298 26.4096 40.7381 26.247 40.4866 26.0439C39.9831 25.6374 39.2421 25.0706 38.3064 24.4421C36.4284 23.1808 33.7994 21.6939 30.7562 20.7419C27.7367 19.7974 24.2261 19.5264 21.416 19.5036C20.0218 19.4923 18.8227 19.542 17.9742 19.5945C17.5504 19.6207 17.215 19.6475 16.9878 19.6675C16.8742 19.6775 16.7876 19.6858 16.7307 19.6915L16.6677 19.6979L16.6506 19.6997Z"
              fill="#F5F8FB"
            />
          </g>
          <path
            d="M25.6666 26.5837C25.6666 27.0899 25.2562 27.5003 24.75 27.5003C24.2437 27.5003 23.8333 27.0899 23.8333 26.5837C23.8333 26.0774 24.2437 25.667 24.75 25.667C25.2562 25.667 25.6666 26.0774 25.6666 26.5837Z"
            fill="#F5F8FB"
          />
          <path
            d="M31.1668 28.4167C31.1668 28.9229 30.7564 29.3333 30.2501 29.3333C29.7438 29.3333 29.3334 28.9229 29.3334 28.4167C29.3334 27.9104 29.7438 27.5 30.2501 27.5C30.7564 27.5 31.1668 27.9104 31.1668 28.4167Z"
            fill="#F5F8FB"
          />
          <path
            d="M34.8333 26.5837C34.8333 27.0899 34.4229 27.5003 33.9167 27.5003C33.4104 27.5003 33 27.0899 33 26.5837C33 26.0774 33.4104 25.667 33.9167 25.667C34.4229 25.667 34.8333 26.0774 34.8333 26.5837Z"
            fill="#F5F8FB"
          />
        </svg>
      ),
      name: 'Brazilian',
      position: 'bottom-[20%] left-[15%]',
    },
    {
      emoji: (
        <svg width="44" height="33" viewBox="0 0 44 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_2193_2522)">
            <rect width="43.6533" height="30.0117" fill="#EEF3F8" />
            <rect width="24.555" height="19.0983" fill="#41479B" />
            <rect x="24.5551" width="19.0983" height="2.72833" fill="#DC251C" />
            <rect x="24.5551" y="5.45703" width="19.0983" height="2.72833" fill="#DC251C" />
            <rect x="24.5551" y="10.9131" width="19.0983" height="2.72833" fill="#DC251C" />
            <rect x="24.5551" y="16.3701" width="19.0983" height="2.72833" fill="#DC251C" />
            <rect x="0.00012207" y="21.8271" width="43.6533" height="2.72833" fill="#DC251C" />
            <rect x="6.10352e-05" y="27.2833" width="43.6533" height="2.72833" fill="#DC251C" />
            <rect x="2.72833" y="2.72839" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="8.18512" y="2.72839" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="13.6418" y="2.72839" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="19.0984" y="2.72839" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="2.72833" y="8.18542" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="8.18512" y="8.18542" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="13.6418" y="8.18542" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="5.45685" y="10.913" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="10.9135" y="10.913" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="16.3703" y="10.913" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="5.45679" y="5.45673" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="10.9135" y="5.45673" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="16.3702" y="5.45673" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="19.0984" y="8.18542" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="2.72839" y="13.6417" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="8.18512" y="13.6417" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="13.6418" y="13.6417" width="2.72833" height="2.72833" fill="#7C3AED" />
            <rect x="19.0984" y="13.6417" width="2.72833" height="2.72833" fill="#7C3AED" />
          </g>
          <defs>
            <clipPath id="clip0_2193_2522">
              <rect width="43.6533" height="32.74" rx="2.18267" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      name: 'American',
      position: 'top-[35%] right-[30%]',
    },
    {
      emoji: (
        <svg width="56" height="42" viewBox="0 0 56 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="55.0426" height="41.282" rx="2.75213" fill="#F5F8FB" />
          <circle cx="27.5213" cy="20.641" r="12.0406" fill="#DC251C" />
        </svg>
      ),
      name: 'Japanese',
      position: 'top-[20%] right-[15%]',
    },
    {
      emoji: (
        <svg width="44" height="33" viewBox="0 0 44 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_2193_3451)">
            <rect width="43.6533" height="32.74" fill="#F5F8FB" />
            <rect
              x="10.9135"
              width="32.74"
              height="10.9133"
              transform="rotate(90 10.9135 0)"
              fill="#E31D1C"
            />
            <rect
              x="43.6534"
              width="32.74"
              height="10.9133"
              transform="rotate(90 43.6534 0)"
              fill="#E31D1C"
            />
            <path
              d="M18.8504 10.9794L21.8267 6.82129L24.8031 10.9794V14.521L30.0117 15.1112L26.2913 19.8333L23.3149 21.0139L22.3489 24.1983C22.1923 24.7147 21.4612 24.7147 21.3046 24.1983L20.3385 21.0139L17.3622 19.8333L13.6417 15.1112L18.8504 14.521V10.9794Z"
              fill="#DC251C"
            />
          </g>
          <defs>
            <clipPath id="clip0_2193_3451">
              <rect width="43.6533" height="32.74" rx="2.18267" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
      name: 'Canadian',
      position: 'bottom-[25%] right-[18%]',
    },
  ];

  // Confused face SVG for "Before" cards
  const ConfusedFace = (): JSX.Element => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 26.5601C0 14.0396 0 7.77927 3.88964 3.88964C7.77927 0 14.0395 0 26.5601 0L33.3674 0C45.888 0 52.1483 0 56.0379 3.88964C59.9275 7.77927 59.9275 14.0395 59.9275 26.5601L59.9275 33.3674C59.9275 45.888 59.9275 52.1482 56.0379 56.0379C52.1483 59.9275 45.888 59.9275 33.3674 59.9275L26.5601 59.9275C14.0396 59.9275 7.77927 59.9275 3.88964 56.0379C0 52.1482 0 45.888 0 33.3674L0 26.5601Z"
        fill="#EBEBEB"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.2157 12.0358C11.5423 11.7962 12.0013 11.8668 12.2408 12.1935C13.9135 14.4745 19.4797 19.1185 27.9969 18.7399C28.4016 18.7219 28.7442 19.0354 28.7622 19.4401C28.7802 19.8447 28.4667 20.1874 28.062 20.2053C18.9767 20.6091 12.9709 15.6695 11.0579 13.061C10.8184 12.7343 10.889 12.2753 11.2157 12.0358Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.9993 12.0358C48.6727 11.7962 48.2137 11.8668 47.9741 12.1935C46.3014 14.4745 40.7352 19.1185 32.2181 18.7399C31.8134 18.7219 31.4708 19.0354 31.4528 19.4401C31.4348 19.8447 31.7483 20.1874 32.1529 20.2053C41.2383 20.6091 47.2441 15.6695 49.157 13.061C49.3966 12.7343 49.326 12.2753 48.9993 12.0358Z"
        fill="black"
      />
      <path
        d="M48.5657 21.6499C49.3806 25.4063 49.0547 33.6524 41.2313 33.6524C33.386 33.6524 32.2671 25.7706 32.6746 21.463L29.0074 21.4198C29.3334 25.6603 27.9317 34.0924 19.7172 33.8969C11.5027 33.7013 10.916 25.3612 11.6494 21.2156L29.0074 21.4198L32.6746 21.463L48.5657 21.6499Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.47116 21.1782C8.47434 20.9082 8.69582 20.6919 8.96584 20.695L50.5272 21.184C50.7973 21.1872 51.0136 21.4087 51.0104 21.6787C51.0072 21.9487 50.7858 22.165 50.5157 22.1618L49.1576 22.1459C49.479 24.0863 49.4983 26.8455 48.5951 29.2328C48.0916 30.5637 47.2941 31.7974 46.0842 32.6975C44.8706 33.6004 43.2773 34.1413 41.2313 34.1413C39.1842 34.1413 37.5461 33.6258 36.2549 32.7596C34.9664 31.8953 34.0519 30.701 33.4177 29.3854C32.2536 26.9705 32.0131 24.106 32.1465 21.9457L29.5259 21.9149C29.6127 24.0697 29.2812 27.0394 28.0003 29.5445C27.3019 30.9103 26.3142 32.1511 24.9457 33.0367C23.5738 33.9244 21.8474 34.4367 19.7055 34.3857C17.5656 34.3347 15.8891 33.7511 14.5998 32.8109C13.3134 31.8728 12.4432 30.6021 11.8756 29.2236C10.8431 26.7157 10.7922 23.8052 11.0793 21.6979L8.95434 21.6729C8.68431 21.6697 8.46799 21.4482 8.47116 21.1782ZM12.0652 21.7095C11.7748 23.7111 11.8128 26.5023 12.7799 28.8513C13.2942 30.1005 14.0651 31.2107 15.176 32.0208C16.2842 32.829 17.7615 33.3612 19.7288 33.408C21.6941 33.4548 23.2233 32.9864 24.4144 32.2157C25.6089 31.4427 26.4915 30.3471 27.1296 29.0993C28.3228 26.7657 28.6363 23.946 28.5466 21.9034L12.0652 21.7095ZM33.1256 21.9573C32.9919 24.0175 33.2216 26.7267 34.2986 28.9607C34.8738 30.154 35.6845 31.1994 36.7997 31.9475C37.912 32.6937 39.3557 33.1634 41.2313 33.1634C43.0969 33.1634 44.4781 32.6736 45.5005 31.9129C46.5266 31.1495 47.2264 30.0869 47.6805 28.8868C48.5333 26.6326 48.4927 23.9588 48.1633 22.1342L33.1256 21.9573Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M44.2319 44.5203C34.0265 37.3388 22.2851 41.5131 17.6743 44.534C17.3355 44.756 16.8808 44.6613 16.6588 44.3225C16.4369 43.9837 16.5316 43.529 16.8704 43.307C21.7127 40.1345 34.1585 35.638 45.0761 43.3207C45.4073 43.5538 45.4869 44.0114 45.2538 44.3426C45.0207 44.6739 44.5631 44.7535 44.2319 44.5203Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.6146 39.3949C16.8187 39.5717 16.8407 39.8805 16.6639 40.0846C16.1836 40.6388 15.5971 41.6427 15.4275 42.8111C15.2612 43.957 15.4918 45.2714 16.6527 46.5215C16.8364 46.7194 16.825 47.0288 16.6271 47.2125C16.4292 47.3963 16.1198 47.3848 15.9361 47.1869C14.5543 45.6989 14.2552 44.0796 14.4597 42.6707C14.6609 41.2843 15.3457 40.1124 15.9249 39.4441C16.1017 39.2401 16.4105 39.218 16.6146 39.3949Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M45.5561 39.6394C45.352 39.8162 45.33 40.125 45.5068 40.3291C45.9871 40.8833 46.5736 41.8872 46.7432 43.0556C46.9095 44.2015 46.6789 45.5159 45.518 46.766C45.3343 46.9639 45.3457 47.2733 45.5436 47.4571C45.7415 47.6408 46.0509 47.6293 46.2347 47.4315C47.6164 45.9434 47.9155 44.3241 47.711 42.9152C47.5098 41.5288 46.825 40.3569 46.2458 39.6886C46.069 39.4846 45.7602 39.4625 45.5561 39.6394Z"
        fill="black"
      />
      <path
        d="M24.8511 24.3622C24.8511 26.2525 23.3188 27.7849 21.4284 27.7849C19.5381 27.7849 18.0057 26.2525 18.0057 24.3622C18.0057 22.4718 19.5381 20.9395 21.4284 20.9395C23.3188 20.9395 24.8511 22.4718 24.8511 24.3622Z"
        fill="black"
      />
      <path
        d="M42.4536 24.3622C42.4536 26.2525 40.9212 27.7849 39.0309 27.7849C37.1406 27.7849 35.6082 26.2525 35.6082 24.3622C35.6082 22.4718 37.1406 20.9395 39.0309 20.9395C40.9212 20.9395 42.4536 22.4718 42.4536 24.3622Z"
        fill="black"
      />
      <path
        d="M23.3844 24.3622C23.3844 24.9023 22.9465 25.3401 22.4064 25.3401C21.8664 25.3401 21.4285 24.9023 21.4285 24.3622C21.4285 23.8221 21.8664 23.3843 22.4064 23.3843C22.9465 23.3843 23.3844 23.8221 23.3844 24.3622Z"
        fill="white"
      />
      <path
        d="M40.9868 24.3622C40.9868 24.9023 40.5489 25.3401 40.0089 25.3401C39.4688 25.3401 39.0309 24.9023 39.0309 24.3622C39.0309 23.8221 39.4688 23.3843 40.0089 23.3843C40.5489 23.3843 40.9868 23.8221 40.9868 24.3622Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M31.0944 44.7306C29.6953 44.8796 28.3366 45.3942 27.5228 45.8205C27.2836 45.9458 26.9881 45.8534 26.8628 45.6142C26.7375 45.375 26.8298 45.0795 27.0691 44.9542C27.9667 44.484 29.4439 43.9229 30.9908 43.7582C32.5311 43.5941 34.239 43.8156 35.465 45.0416C35.656 45.2325 35.656 45.5421 35.465 45.7331C35.2741 45.924 34.9645 45.924 34.7735 45.7331C33.8481 44.8077 32.5 44.5809 31.0944 44.7306Z"
        fill="black"
      />
      <path
        d="M27.0516 27.3125C27.0516 29.3378 24.9319 32.691 20.2062 32.691C15.4804 32.691 13.1163 29.3378 13.1163 27.3125C13.1163 25.2872 15.4804 30.0018 20.2062 30.0018C24.9319 30.0018 27.0516 25.2872 27.0516 27.3125Z"
        fill="#DFECF1"
      />
      <path
        d="M47.8322 27.3111C47.8322 29.3307 45.8241 32.6745 41.347 32.6745C36.87 32.6745 34.6303 29.3307 34.6303 27.3111C34.6303 25.2915 36.87 29.9928 41.347 29.9928C45.8241 29.9928 47.8322 25.2915 47.8322 27.3111Z"
        fill="#DFECF1"
      />
    </svg>
  );

  // Happy face SVG for "After" cards
  const HappyFace = (): JSX.Element => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0.00127246 26.5601C0.000672617 14.0395 0.000372696 7.77927 3.88982 3.88964C7.77927 0 14.0395 0 26.5601 0L33.4322 0C45.9527 0 52.213 0 56.1028 3.88964C59.9926 7.77927 59.9929 14.0395 59.9935 26.5601L59.9939 33.4322C59.9945 45.9527 59.9948 52.213 56.1053 56.1026C52.2159 59.9923 45.9556 59.9923 33.435 59.9923H26.5629C14.0424 59.9923 7.78215 59.9923 3.89232 56.1026C0.00250146 52.213 0.00220154 45.9527 0.00160169 33.4322L0.00127246 26.5601Z"
        fill="#EBEBEB"
      />
      <path
        d="M28.4838 25.8078C28.4838 30.5605 24.6311 34.4133 19.8784 34.4133C15.1257 34.4133 11.2729 30.5605 11.2729 25.8078C11.2729 21.0552 15.1257 17.2024 19.8784 17.2024C24.6311 17.2024 28.4838 21.0552 28.4838 25.8078Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.8784 33.4298C24.0879 33.4298 27.5004 30.0173 27.5004 25.8078C27.5004 21.5983 24.0879 18.1859 19.8784 18.1859C15.6689 18.1859 12.2564 21.5983 12.2564 25.8078C12.2564 30.0173 15.6689 33.4298 19.8784 33.4298ZM19.8784 34.4133C24.6311 34.4133 28.4838 30.5605 28.4838 25.8078C28.4838 21.0552 24.6311 17.2024 19.8784 17.2024C15.1257 17.2024 11.2729 21.0552 11.2729 25.8078C11.2729 30.5605 15.1257 34.4133 19.8784 34.4133Z"
        fill="black"
      />
      <path
        d="M46.6782 25.8078C46.6782 30.5605 42.8255 34.4133 38.0728 34.4133C33.3201 34.4133 29.4673 30.5605 29.4673 25.8078C29.4673 21.0552 33.3201 17.2024 38.0728 17.2024C42.8255 17.2024 46.6782 21.0552 46.6782 25.8078Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.0728 33.4298C42.2823 33.4298 45.6948 30.0173 45.6948 25.8078C45.6948 21.5983 42.2823 18.1859 38.0728 18.1859C33.8633 18.1859 30.4508 21.5983 30.4508 25.8078C30.4508 30.0173 33.8633 33.4298 38.0728 33.4298ZM38.0728 34.4133C42.8255 34.4133 46.6782 30.5605 46.6782 25.8078C46.6782 21.0552 42.8255 17.2024 38.0728 17.2024C33.3201 17.2024 29.4673 21.0552 29.4673 25.8078C29.4673 30.5605 33.3201 34.4133 38.0728 34.4133Z"
        fill="black"
      />
      <path
        d="M26.7482 27.5289C26.7482 29.5658 24.6165 32.9381 19.8638 32.9381C15.1112 32.9381 12.7336 29.5658 12.7336 27.5289C12.7336 25.4921 15.1112 30.2335 19.8638 30.2335C24.6165 30.2335 26.7482 25.4921 26.7482 27.5289Z"
        fill="#DFECF1"
      />
      <path
        d="M44.9426 27.5289C44.9426 29.5658 42.8109 32.9381 38.0582 32.9381C33.3055 32.9381 30.928 29.5658 30.928 27.5289C30.928 25.4921 33.3055 30.2335 38.0582 30.2335C42.8109 30.2335 44.9426 25.4921 44.9426 27.5289Z"
        fill="#DFECF1"
      />
      <path
        d="M21.5995 20.8905C21.5995 22.6557 20.1685 24.0868 18.4032 24.0868C16.6379 24.0868 15.2069 22.6557 15.2069 20.8905C15.2069 19.1252 16.6379 17.6942 18.4032 17.6942C20.1685 17.6942 21.5995 19.1252 21.5995 20.8905Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.4032 23.1033C19.6253 23.1033 20.616 22.1126 20.616 20.8905C20.616 19.6683 19.6253 18.6776 18.4032 18.6776C17.1811 18.6776 16.1904 19.6683 16.1904 20.8905C16.1904 22.1126 17.1811 23.1033 18.4032 23.1033ZM18.4032 24.0868C20.1685 24.0868 21.5995 22.6557 21.5995 20.8905C21.5995 19.1252 20.1685 17.6942 18.4032 17.6942C16.6379 17.6942 15.2069 19.1252 15.2069 20.8905C15.2069 22.6557 16.6379 24.0868 18.4032 24.0868Z"
        fill="black"
      />
      <path
        d="M39.7938 20.8905C39.7938 22.6557 38.3628 24.0868 36.5975 24.0868C34.8322 24.0868 33.4012 22.6557 33.4012 20.8905C33.4012 19.1252 34.8322 17.6942 36.5975 17.6942C38.3628 17.6942 39.7938 19.1252 39.7938 20.8905Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36.5975 23.1033C37.8196 23.1033 38.8103 22.1126 38.8103 20.8905C38.8103 19.6683 37.8196 18.6776 36.5975 18.6776C35.3754 18.6776 34.3847 19.6683 34.3847 20.8905C34.3847 22.1126 35.3754 23.1033 36.5975 23.1033ZM36.5975 24.0868C38.3628 24.0868 39.7938 22.6557 39.7938 20.8905C39.7938 19.1252 38.3628 17.6942 36.5975 17.6942C34.8322 17.6942 33.4012 19.1252 33.4012 20.8905C33.4012 22.6557 34.8322 24.0868 36.5975 24.0868Z"
        fill="black"
      />
      <path
        d="M19.1408 19.907C19.1408 20.586 18.5904 21.1364 17.9115 21.1364C17.2325 21.1364 16.6821 20.586 16.6821 19.907C16.6821 19.2281 17.2325 18.6777 17.9115 18.6777C18.5904 18.6777 19.1408 19.2281 19.1408 19.907Z"
        fill="white"
      />
      <path
        d="M37.3351 19.907C37.3351 20.586 36.7847 21.1364 36.1058 21.1364C35.4268 21.1364 34.8764 20.586 34.8764 19.907C34.8764 19.2281 35.4268 18.6777 36.1058 18.6777C36.7847 18.6777 37.3351 19.2281 37.3351 19.907Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.6559 9.50747C21.1331 10.3456 19.5011 11.8627 18.4606 13.0233C18.1887 13.3266 17.7224 13.352 17.4191 13.0801C17.1157 12.8081 17.0903 12.3418 17.3622 12.0385C18.4526 10.8223 20.2136 9.16774 21.9446 8.21507C22.802 7.74313 23.743 7.39195 24.6364 7.43533C25.6053 7.48237 26.4235 7.99011 26.9308 9.0047C27.1129 9.36906 26.9653 9.81213 26.6009 9.99431C26.2365 10.1765 25.7935 10.0288 25.6113 9.66444C25.3318 9.10546 24.978 8.92887 24.5649 8.90881C24.0763 8.88508 23.4252 9.08404 22.6559 9.50747Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32.3443 8.36287C31.9965 8.60364 31.7642 8.95624 31.6423 9.32197C31.5135 9.70844 31.0957 9.9173 30.7093 9.78848C30.3228 9.65965 30.1139 9.24193 30.2428 8.85547C30.4487 8.23772 30.8535 7.60069 31.5046 7.14995C32.1662 6.69192 33.0302 6.46255 34.0776 6.58591C36.1199 6.82646 38.8752 8.40432 42.5418 12.2691C42.8222 12.5646 42.8099 13.0315 42.5143 13.3119C42.2188 13.5923 41.7519 13.58 41.4716 13.2844C37.8604 9.47807 35.4114 8.22843 33.905 8.051C33.178 7.96537 32.6816 8.12939 32.3443 8.36287Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M43.047 36.937C43.4185 37.1041 43.5841 37.5408 43.417 37.9123C41.5147 42.1396 37.6104 44.2029 33.6486 45.0908C29.6884 45.9784 25.5508 45.7245 22.9346 45.2181C22.5346 45.1407 22.2731 44.7538 22.3506 44.3538C22.428 43.9539 22.8149 43.6924 23.2149 43.7698C25.6799 44.2469 29.6069 44.4848 33.326 43.6513C37.0436 42.8181 40.4334 40.9475 42.0717 37.3069C42.2388 36.9354 42.6755 36.7698 43.047 36.937Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M44.7096 38.4038C42.9206 36.7937 41.4726 36.926 41.0106 37.08C40.6241 37.2089 40.2064 37 40.0776 36.6135C39.9488 36.2271 40.1576 35.8093 40.5441 35.6805C41.5573 35.3428 43.5515 35.3768 45.6965 37.3072C45.9993 37.5798 46.0238 38.0461 45.7513 38.3489C45.4788 38.6517 45.0124 38.6763 44.7096 38.4038Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M47.8806 35.806C42.8294 32.4385 38.484 34.8666 36.9536 36.4735C36.7663 36.6702 36.455 36.6778 36.2584 36.4905C36.0617 36.3032 36.0541 35.9919 36.2414 35.7953C37.9893 33.9601 42.8558 31.2741 48.4262 34.9877C48.6521 35.1383 48.7132 35.4436 48.5625 35.6696C48.4119 35.8955 48.1066 35.9566 47.8806 35.806Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.8912 45.1099C39.0942 45.2904 39.1124 45.6012 38.932 45.8042C38.0469 46.7999 36.7828 47.3045 35.6149 47.545C34.4424 47.7863 33.3062 47.7744 32.6026 47.6865C32.3331 47.6528 32.142 47.407 32.1757 47.1376C32.2093 46.8681 32.4551 46.6769 32.7246 46.7106C33.3324 46.7866 34.3598 46.7993 35.4165 46.5817C36.4778 46.3632 37.5085 45.9253 38.197 45.1508C38.3774 44.9478 38.6882 44.9295 38.8912 45.1099Z"
        fill="black"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(262,70%,20%)] via-[hsl(220,60%,30%)] to-[hsl(200,50%,35%)] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">TowerOfBabel</span>
        </div>

        <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
          <a href="#our-solutions" className="hover:text-primary transition-colors">
            Solution
          </a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="hover:text-primary transition-colors">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
            <Link href="/sign-in">
              Login / Sign Up <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20 relative">
        {/* Floating Flags */}
        {flags.map((flag, index) => (
          <div key={index} className={`hidden lg:block absolute ${flag.position}`}>
            <div className="drop-shadow-lg">{flag.emoji}</div>
          </div>
        ))}

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
            Cross Cultural Communication
          </div>

          <h1 className="text-5xl md:text-7xl mb-6 leading-tight lg:text-7xl">
            Understand What They{' '}
            <span className="font-bold underline underline-offset-[10px] inline-block leading-relaxed">
              Really
            </span>
            <span className="block mt-2">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Mean Across Cultures
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            AI-powered cultural interpretation that reveals hidden meanings, emotions, and communication
            styles before you hit send
          </p>

          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 rounded-full px-8 py-6 text-lg font-semibold shadow-xl"
          >
            <Link href="/sign-in">
              Try for Free - No Credit Card <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>

          {/* Globe Hero Visual */}
          <div className="mt-12 relative flex justify-center"></div>
        </div>
      </div>

      {/* Our Solutions Section */}
      <div id="our-solutions" className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
            Our Solutions
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Understand Cultural
            <br />
            Nuance Instantly
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Card 1 - German */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">Before</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ConfusedFace />
                </div>
                <div>
                  <p className="font-semibold">My German colleague seems angry?</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Misinterpreting directness as frustration</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-6">After</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <HappyFace />
                </div>
                <div>
                  <p className="font-semibold">Actually, this is normal directness</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Understanding clarity-focused communication</p>
            </div>
          </div>

          {/* Card 2 - Japanese (Highlighted) */}
          <div className="bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-transparent backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">Before</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ConfusedFace />
                </div>
                <div>
                  <p className="font-semibold">Why did my Japanese client avoid saying &apos;no&apos;?</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Unclear commitments</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-6">After</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <HappyFace />
                </div>
                <div>
                  <p className="font-semibold">This is a cultural preference for indirect communication.</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Confident next steps based on cultural norms</p>
            </div>
          </div>

          {/* Card 3 - American */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">Before</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ConfusedFace />
                </div>
                <div>
                  <p className="font-semibold">My American teammate keeps using small talk--do I need to?</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Awkward or minimal interaction</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-6">After</h3>
              <div className="bg-black/30 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <HappyFace />
                </div>
                <div>
                  <p className="font-semibold">Yes, it builds rapport in U.S. workplace culture</p>
                </div>
              </div>
              <p className="text-white/60 text-sm">Smooth, culturally aligned communication</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
            How It Works
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">A simple, three-step flow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Step 1 - Purple Gradient */}
          <div className="relative">
            <div className="bg-gradient-to-br from-purple-800/30 via-purple-700/20 to-transparent backdrop-blur-sm rounded-full aspect-square flex flex-col items-center justify-center p-8 border border-purple-500/30">
              <FileText className="w-16 h-16 mb-6" />
              <p className="text-sm text-white/70 mb-2">Steps 1</p>
              <h3 className="text-2xl md:text-3xl font-bold text-center">
                Paste
                <br />
                message
              </h3>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="bg-white/5 backdrop-blur-sm rounded-full aspect-square flex flex-col items-center justify-center p-8 border border-white/10">
              <Globe className="w-16 h-16 mb-6" />
              <p className="text-sm text-white/70 mb-2">Steps 2</p>
              <h3 className="text-2xl md:text-3xl font-bold text-center">
                Select
                <br />
                cultures
              </h3>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="bg-white/5 backdrop-blur-sm rounded-full aspect-square flex flex-col items-center justify-center p-8 border border-white/10">
              <Sparkles className="w-16 h-16 mb-6" />
              <p className="text-sm text-white/70 mb-2">Steps 3</p>
              <h3 className="text-2xl md:text-3xl font-bold text-center">
                Get instant
                <br />
                insights
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm">
            Pricing Plan
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold max-w-4xl mx-auto">
            Simple, transparent pricing for global communication.
          </h2>
        </div>

        <div className="flex justify-center gap-8">
          <div className="max-w-[570px] w-full">
            <FreeTrial />
          </div>
          <div className="max-w-[570px] w-full">
            <Pro />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Processed by Anthropic - No message storage by TowerOfBabel</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Copyright 2025 TowerOfBabel</span>
            <span>|</span>
            <span>All Rights Reserved</span>
            <span>|</span>
            <a href="#" className="hover:text-white transition-colors">
              Terms and Conditions
            </a>
            <span>|</span>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
