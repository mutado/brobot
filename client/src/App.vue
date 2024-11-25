<template>
    <Transition
        leave-to-class="opacity-0"
        leave-active-class="transition-opacity duration-300"
    >
        <div
            v-if="loading"
            class="bg-background absolute inset-0 flex items-center justify-center flex-col gap-2"
        >
            <fingerprint-icon class="animate-pulse w-12 h-12 text-primary" />
            Signing in
        </div>
    </Transition>
    <template v-if="user">
        <header class="flex justify-between p-1">
            <img
                :src="lp.initData?.user?.photoUrl"
                alt="Avatar"
                class="w-8 h-8 rounded-full"
            />
            <div class="grid grid-cols-3 gap-2 w-2/3">
                <div class="flex items-center gap-1">
                    <coins-icon class="w-6 h-6" />
                    <span>{{ formatNumber(user.balance) }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <ruler-icon class="w-6 h-6" />
                    <span>{{ formatNumber(user.pLength) }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <star-icon class="w-6 h-6" />
                    <span>{{ formatNumber(user.socialScore) }}</span>
                </div>
            </div>
        </header>
        <main class="grow flex flex-col items-center justify-center relative">
            <button
                ref="clickerButton"
                @click="onClick"
                class="h-32 w-32 bg-accent rounded-full relative"
            ></button>
            <div class="absolute bottom-2 grid w-full gap-2 grid-cols-3 px-4">
                <Drawer>
                    <DrawerTrigger
                        class="flex flex-col items-center justify-center gap-1 bg-accent p-2 rounded-md"
                    >
                        <shirt-icon class="w-6 h-6 text-primary" />
                        Inventory
                    </DrawerTrigger>
                    <DrawerContent class="h-[90dvh]">
                        <DrawerHeader>
                            <DrawerTitle>Inventory</DrawerTitle>
                            <DrawerDescription>Your items</DrawerDescription>
                        </DrawerHeader>

                        <inventory-view
                            class="grow"
                            v-model:items="inventory"
                            @reload="loadInventory"
                        />
                    </DrawerContent>
                </Drawer>

                <Drawer>
                    <DrawerTrigger
                        class="flex flex-col items-center justify-center gap-1 bg-accent p-2 rounded-md"
                    >
                        <arrow-up-fading-icon class="w-6 h-6 text-primary" />
                        Upgrades
                    </DrawerTrigger>
                    <DrawerContent class="h-[90dvh]">
                        <DrawerHeader class="shrink-0">
                            <DrawerTitle>Upgrades</DrawerTitle>
                            <DrawerDescription>
                                Spend your coins to upgrade your clicker
                            </DrawerDescription>
                        </DrawerHeader>

                        <div
                            class="overflow-y-auto grow h-full grid grid-cols-2 gap-3 px-3"
                        >
                            <div
                                v-for="upgrade in upgrades"
                                :key="upgrade.type"
                                @click="upgradeClicker(upgrade)"
                                class="border text-center rounded h-full p-2 flex flex-col justify-between"
                            >
                                <h1 class="text-sm">
                                    {{ upgrade.name }}
                                </h1>
                                <p class="text-xs opacity-85">
                                    {{ upgrade.description }}
                                </p>
                                <div class="flex justify-between">
                                    <span
                                        class="text-xs"
                                        :class="[
                                            user.balance >= upgrade.money
                                                ? 'text-primary'
                                                : 'text-red-400',
                                        ]"
                                    >
                                        {{ formatNumber(upgrade.money) }}
                                    </span>
                                    <span class="text-xs">
                                        +{{
                                            formatNumber(upgrade.upgradeMoney)
                                        }}
                                        <coins-icon
                                            class="w-4 h-4 float-right"
                                        />
                                    </span>
                                    <span class="text-xs">
                                        lvl
                                        {{
                                            myUpgrades.find(
                                                (u) => u.type === upgrade.type
                                            )?.level || 0
                                        }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>

                <Drawer>
                    <DrawerTrigger
                        class="flex flex-col items-center justify-center gap-1 bg-accent p-2 rounded-md"
                    >
                        <shopping-cart-icon class="w-6 h-6 text-primary" />
                        Market
                    </DrawerTrigger>
                    <DrawerContent class="h-[90dvh]">
                        <DrawerHeader>
                            <DrawerTitle>Market</DrawerTitle>
                            <DrawerDescription>Buy items</DrawerDescription>
                        </DrawerHeader>
                        <DrawerFooter>
                            <p>Coming soon</p>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        </main>
    </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { backButton, useLaunchParams } from '@telegram-apps/sdk-vue'
import { useColorMode, useDebounceFn } from '@vueuse/core'
import FingerprintIcon from './icons/FingerprintIcon.vue'
import CoinsIcon from './icons/CoinsIcon.vue'
import { formatNumber } from './lib/formatting'
import RulerIcon from './icons/RulerIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import Drawer from './components/ui/drawer/Drawer.vue'
import { DrawerTrigger } from 'vaul-vue'
import DrawerContent from './components/ui/drawer/DrawerContent.vue'
import DrawerHeader from './components/ui/drawer/DrawerHeader.vue'
import DrawerTitle from './components/ui/drawer/DrawerTitle.vue'
import DrawerDescription from './components/ui/drawer/DrawerDescription.vue'
import DrawerFooter from './components/ui/drawer/DrawerFooter.vue'
import ArrowUpFadingIcon from './icons/ArrowUpFadingIcon.vue'
import ShirtIcon from './icons/ShirtIcon.vue'
import ShoppingCartIcon from './icons/ShoppingCartIcon.vue'
import InventoryItem from './components/InventoryItem.vue'
import InventoryView from './components/InventoryView.vue'

const lp = useLaunchParams()
const mode = useColorMode()
const loading = ref(true)
const user = ref(null as any)
const upgrades = ref([] as any)
const myUpgrades = ref([] as any)
const inventory = ref([] as any)

const clickerButton = ref<HTMLButtonElement | null>(null)
const pendingClicks = ref(0)
const pushClicksDebounced = useDebounceFn(
    () => {
        const registeredClicks = Math.floor(pendingClicks.value)
        pendingClicks.value = pendingClicks.value - registeredClicks
        axios.post(__API_PATH__ + '/clicks', { clicks: registeredClicks })
    },
    1000,
    {
        maxWait: 10000,
    }
)

onMounted(async () => {
    axios.defaults.headers.authorization = `tma ${lp.initDataRaw}`
    const { data } = await axios.get(__API_PATH__ + '/auth/user')
    user.value = data
    setTimeout(() => {
        loading.value = false
    }, 1)

    loadClicker()
    loadUpgrades()
    loadInventory()
})

function increment() {
    pendingClicks.value += 1
    pushClicksDebounced()

    const rect = clickerButton.value?.getBoundingClientRect()
    if (!rect) return

    const xOffset = Math.random() * rect.width
    const yOffset = Math.random() * rect.height

    user.value.balance += user.value.moneyPerClick
    // create a coin animation
    const coin = document.createElement('div')
    coin.classList.add('coin')
    coin.style.top = `${yOffset}px`
    coin.style.left = `${xOffset}px`
    clickerButton.value?.appendChild(coin)
    setTimeout(() => {
        coin.remove()
    }, 1100)
}

function onClick() {
    increment()
}

function loadClicker() {
    axios.get(__API_PATH__ + '/my-upgrades').then(({ data }) => {
        myUpgrades.value = data
    })
}

function loadUpgrades() {
    axios.get(__API_PATH__ + '/upgrades').then(({ data }) => {
        upgrades.value = data
    })
}

async function upgradeClicker(upgrade: any) {
    if (user.value.balance < upgrade.money) return

    const myUpgrade = myUpgrades.value.find((u: any) => u.type === upgrade.type)
    if (myUpgrade) {
        myUpgrade.level += 1
    } else {
        myUpgrades.value.push({ type: upgrade.type, level: 1 })
    }
    user.value.balance -= upgrade.money

    axios.post(__API_PATH__ + '/buy-upgrade', { type: upgrade.type })
}

function loadInventory() {
    axios.get(__API_PATH__ + '/inventory').then(({ data }) => {
        inventory.value = data
    })
}
</script>
