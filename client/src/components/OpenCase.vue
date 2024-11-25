<template>
    <Drawer>
        <DrawerTrigger as-child>
            <Button
                variant="ghost"
                class="w-full flex gap-1 items-center"
            >
                Open
            </Button>
        </DrawerTrigger>
        <DrawerContent class="h-[90dvh]">
            <DrawerHeader>
                <!-- <DrawerTitle class="text-xl">
                    Open case
                </DrawerTitle>
                <DrawerDescription class="text-sm">
                    Open this case to get a random item
                </DrawerDescription> -->
            </DrawerHeader>
            <div class="overflow-y-auto flex flex-col items-center gap-8">
                <template v-if="state === 'idle'">
                    <img
                        :src="item.image"
                        class="w-auto h-32"
                        alt=""
                    />
                    <Button
                        variant="default"
                        @click="openCase"
                        class="w-1/2"
                    >
                        Open
                    </Button>
                    <div>
                        <h1 class="text-center text-lg mb-2">
                            Contains one of the following items:
                        </h1>
                        <div class="grid grid-cols-3 gap-2 px-2">
                            <figure
                                v-for="containsItem in contains"
                                :key="containsItem.id"
                                class="flex py-2 text-center gap-2 flex-col items-center border rounded-lg"
                                :style="{
                                    color: containsItem.rarity?.color,
                                    borderColor: containsItem.rarity?.color,
                                }"
                            >
                                <img
                                    :src="containsItem.image"
                                    class="w-auto h-16 object-contain"
                                    alt=""
                                />
                                <figcaption>
                                    {{ containsItem.name }}
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                </template>
                <div
                    v-else-if="state === 'opening'"
                    class="shrink-0 flex overflow-hidden w-full relative bg-accent"
                >
                    <div
                        ref="openingLineWrapper"
                        class="overflow shrink-0 grow flex w-full py-2"
                    >
                        <div
                            @animationend="onAnimationFinished"
                            ref="openingLineContainer"
                            class="flex"
                        >
                            <figure
                                v-for="(
                                    openingLineItem, index
                                ) in openingLineItems"
                                :key="openingLineItem.id + '-' + index"
                                class="flex shrink-0 bg-background mx-1 h-32 w-32 py-2 text-center gap-2 flex-col items-center border rounded-lg"
                                :style="{
                                    color: openingLineItem.rarity?.color,
                                    borderColor: openingLineItem.rarity?.color,
                                }"
                            >
                                <img
                                    :src="openingLineItem.image"
                                    class="w-auto h-16 object-contain"
                                    alt=""
                                />
                            </figure>
                        </div>
                    </div>
                    <div
                        class="absolute bg-red-50 left-1/2 top-0 -translate-x-1/2 h-full w-0"
                    >
                        <div class="triangle-down absolute top-0 left-0"></div>
                        <div class="triangle-up absolute bottom-0 left-0"></div>
                    </div>
                </div>
                <div v-else-if="state === 'opened'">
                    <div
                        v-if="wonItem"
                        class="flex flex-col items-center gap-4 w-full"
                    >
                        <img
                            :src="wonItem.image"
                            class="w-auto h-32"
                            alt=""
                        />
                        <h1 class="text-xl">
                            {{ wonItem.name }}
                        </h1>
                    </div>
                </div>
            </div>
            <DrawerFooter v-if="state === 'opened'">
                <Button
                    variant="default"
                    class="flex w-full items-center"
                    @click="emit('sell', wonItem)"
                >
                    Sell for {{ wonItem.price?.toFixed(2) }}
                    <coins-icon class="w-4 h-4" />
                </Button>
                <DrawerClose>
                    <Button
                        variant="ghost"
                        class="w-full"
                    >
                        Close
                    </Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
</template>
<script setup lang="ts">
import { DrawerClose, DrawerTrigger } from 'vaul-vue'
import Drawer from './ui/drawer/Drawer.vue'
import DrawerContent from './ui/drawer/DrawerContent.vue'
import Button from './ui/button/Button.vue'
import DrawerHeader from './ui/drawer/DrawerHeader.vue'
import DrawerTitle from './ui/drawer/DrawerTitle.vue'
import DrawerDescription from './ui/drawer/DrawerDescription.vue'
import { onMounted, ref } from 'vue'
import axios from 'axios'
import CoinsIcon from '@/icons/CoinsIcon.vue'
import DrawerFooter from './ui/drawer/DrawerFooter.vue'

const emit = defineEmits(['sell', 'opened'])

const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
})

const state = ref<'idle' | 'opening' | 'opened'>('idle')
const wonItem = ref(
    null as null | {
        id: number
        name: string
        image: string
        rarity: {
            color: string
        }
    }
)
const openingLineWrapper = ref(null as HTMLDivElement | null)
const openingLineContainer = ref(null as HTMLDivElement | null)

const openingLineItems = ref(
    [] as {
        id: number
        name: string
        image: string
        rarity: {
            color: string
        }
    }[]
)
const contains = ref(
    [] as {
        id: number
        name: string
        image: string
        rarity: {
            color: string
        }
    }[]
)

async function openCase() {
    const { data: openedItem } = await axios.post(
        __API_PATH__ + `/items/${props.item.id}/open`
    )
    emit('opened')
    wonItem.value = openedItem
    openingLineItems.value = []
    for (let index = 0; index < 64; index++) {
        openingLineItems.value.push(
            contains.value[Math.floor(Math.random() * contains.value.length)]
        )
    }

    state.value = 'opening'

    openingLineItems.value[openingLineItems.value.length - 3] = openedItem

    requestAnimationFrame(() => {
        const rect = openingLineContainer.value?.getBoundingClientRect()
        if (!rect || !openingLineContainer.value) return
        const wrapperWidth = openingLineWrapper.value?.clientWidth || 0
        const itemWidth = rect.width / openingLineItems.value.length
        console.log(rect.width, wrapperWidth, itemWidth)

        // random between [-itemWidth/2 + 8, itemWidth/2 - 8]
        const offset = Math.random() * (itemWidth - 16) - itemWidth / 2 + 8

        const endPosition = rect.width - wrapperWidth + offset - itemWidth - 16

        console.log(openingLineContainer.value)

        const animation = openingLineContainer.value.animate(
            [
                {
                    transform: 'translateX(0)',
                },
                {
                    transform: 'translateX(-' + endPosition + 'px)',
                },
            ],
            {
                duration: 1000 * 1,
                // easing: 'cubic-bezier(0, 0.75, 0.25, 0.75)',
                // easing: 'cubic-bezier(0.5, 0.1, 0.15, 1)',
                // easing: 'cubic-bezier(.13,.83,.78,.8)',
                easing: 'cubic-bezier(.08,.6,0,1)',
                iterations: 1,
                fill: 'forwards',
            }
        )

        animation.onfinish = onAnimationFinished
    })
}

function onAnimationFinished() {
    state.value = 'opened'
    openingLineItems.value = []
}

onMounted(() => {
    axios.get(__API_PATH__ + '/crate/' + props.item.itemID).then((res) => {
        contains.value = res.data.contains.concat([
            {
                id: 0,
                name: 'Rare item',
                image: 'https://github.com/ByMykel/counter-strike-image-tracker/blob/main/static/panorama/images/econ/weapon_cases/default_rare_item_png.png?raw=true',
                rarity: {
                    color: '#eb4b4b',
                },
            },
        ])
    })
})
</script>
<style lang="css" scoped>
.triangle-up {
    width: 0px;
    height: 0px;
    border-style: solid;
    border-width: 0 10px 10px 10px;
    border-color: transparent transparent #ff4532 transparent;
    transform: rotate(0deg);
}

.triangle-down {
    width: 0px;
    height: 0px;
    border-style: solid;
    border-width: 10px 10px 0 10px;
    border-color: #ff4532 transparent transparent transparent;
    transform: rotate(0deg);
}
</style>
