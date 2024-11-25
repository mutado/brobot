<template>
    <Drawer @update:open="onClose">
        <DrawerTrigger
            as-child
            class="border text-center text-sm max-h-48 rounded-md"
            :style="{
                borderColor: item.rarityColor,
            }"
        >
            <div
                @click.capture="onClick"
                :class="{
                    'bg-accent': selected,
                }"
            >
                <img
                    :src="item.image"
                    class="w-auto h-32 object-contain mx-auto"
                />
                <h1
                    :style="{
                        color: item.rarityColor,
                    }"
                    class="line-clamp-2"
                >
                    {{ item.name }}
                </h1>
            </div>
        </DrawerTrigger>
        <DrawerContent class="h-[90dvh]">
            <DrawerHeader>
                <img
                    :src="item.image"
                    class="w-auto h-48 object-contain mx-auto"
                />
                <DrawerTitle>
                    {{ item.name }}
                </DrawerTitle>
                <span>
                    {{ item.wear }}
                </span>
                <DrawerDescription>
                    <p
                        v-html="item.description?.replaceAll('\\n', '<br>')"
                        class="text-sm"
                    ></p>
                </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
                <open-case
                    v-if="item.type === 'crate'"
                    :item="item"
                    @sell="emit('sell', $event)"
                    @opened="caseOpened = true"
                />
                <Button
                    @click="emit('sell', item)"
                    class="w-full flex gap-1 items-center"
                >
                    Sell for {{ item.price?.toFixed(2) }}
                    <coins-icon class="w-4 h-4" />
                </Button>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
</template>
<script setup lang="ts">
import { DrawerTrigger } from 'vaul-vue'
import Drawer from './ui/drawer/Drawer.vue'
import DrawerContent from './ui/drawer/DrawerContent.vue'
import DrawerTitle from './ui/drawer/DrawerTitle.vue'
import DrawerHeader from './ui/drawer/DrawerHeader.vue'
import DrawerDescription from './ui/drawer/DrawerDescription.vue'
import DrawerFooter from './ui/drawer/DrawerFooter.vue'
import Button from './ui/button/Button.vue'
import CoinsIcon from '@/icons/CoinsIcon.vue'
import OpenCase from './OpenCase.vue'
import { ref } from 'vue'

const emit = defineEmits(['sell', 'select', 'reload'])
const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
    selectEnabled: {
        type: Boolean,
        default: false,
    },
    selected: {
        type: Boolean,
        default: false,
    },
})

const caseOpened = ref(false)

function onClick(event: MouseEvent) {
    if (props.selectEnabled) {
        event.stopPropagation()
        emit('select', props.item)
    }
}

function onClose(e) {
    if (e === false && caseOpened.value) {
        emit('reload')
    }
}
</script>
