<script setup>
watch(user, () => {}, {
  deep: true
})

console.log('hello')
</script>