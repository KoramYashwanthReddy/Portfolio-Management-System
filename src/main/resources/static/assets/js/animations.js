export function initAnimations() {
    const body = document.body;
    requestAnimationFrame(() => body.classList.add("ready"));

    if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);

        // Section headers reveal
        window.gsap.utils.toArray(".section-heading").forEach((heading) => {
            window.gsap.fromTo(heading.children, {
                opacity: 0,
                y: 40,
                scale: 0.98
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                stagger: 0.15,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: heading,
                    start: "top 85%"
                }
            });
        });

        // Cards & elements reveal
        window.gsap.utils.toArray("[data-reveal]").forEach((element) => {
            window.gsap.fromTo(element, {
                opacity: 0,
                y: 35,
                clipPath: "inset(10% 0% 10% 0%)"
            }, {
                opacity: 1,
                y: 0,
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1.2,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: element,
                    start: "top 88%",
                    toggleActions: "play none none none"
                }
            });
        });
    }
}


