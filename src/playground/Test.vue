<template>
  <div id="app" style="font-family: Arial; padding: 20px; background: #f0f0f0; min-height: 100vh;">
    <h1 style="color: red; font-size: 40px;">MY TODO APP {{ title }}</h1>

    <!-- hiển thị loading -->
    <div v-if="loading == true">
      <p>ĐANG TẢI DỮ LIỆU XIN VUI LÒNG CHỜ ĐỢI.....</p>
    </div>

    <div v-if="loading == false">
      <!-- form thêm todo -->
      <div style="background: white; padding: 15px; margin-bottom: 10px;">
        <h2>Thêm công việc mới:</h2>
        <input
          v-model="newTodoText"
          type="text"
          placeholder="nhập tên công việc..."
          style="width: 300px; padding: 5px; border: 2px solid blue;"
          @keyup="handleKeyup"
        />
        <input
          v-model="newTodoPriority"
          type="number"
          placeholder="độ ưu tiên"
          style="width: 80px; margin-left: 5px;"
        />
        <select v-model="selectedCategory" style="margin-left: 5px;">
          <option value="">-- chọn category --</option>
          <option v-for="cat in categoriesList" :key="cat.id" :value="cat.name">
            {{ cat.name }}
          </option>
        </select>
        <button @click="addTodo()" style="margin-left: 10px; background: green; color: white; padding: 5px 15px;">
          THÊM VÀO
        </button>
        <button @click="clearForm" style="margin-left: 5px; background: orange; color: white; padding: 5px 15px;">
          XÓA FORM
        </button>
      </div>

      <!-- bộ lọc -->
      <div style="background: lightyellow; padding: 10px; margin-bottom: 10px;">
        <span>Lọc: </span>
        <button @click="filterStatus = 'all'" :style="filterStatus === 'all' ? 'background:blue;color:white' : ''">Tất cả ({{ todos.length }})</button>
        <button @click="filterStatus = 'done'" :style="filterStatus === 'done' ? 'background:blue;color:white' : ''" style="margin-left:5px">Hoàn thành</button>
        <button @click="filterStatus = 'undone'" :style="filterStatus === 'undone' ? 'background:blue;color:white' : ''" style="margin-left:5px">Chưa xong</button>
        <input v-model="searchKeyword" type="text" placeholder="tìm kiếm..." style="margin-left: 15px; padding: 3px;" />
        <span style="margin-left: 10px; color: gray; font-size: 12px;">Đang hiển thị: {{ filteredTodos.length }} / {{ todos.length }}</span>
      </div>

      <!-- danh sách todo -->
      <div v-if="filteredTodos.length > 0">
        <div
          v-for="(todo, index) in filteredTodos"
          :key="todo.id"
          :ref="'todoItem_' + todo.id"
          style="background: white; padding: 12px; margin-bottom: 8px; border-left: 4px solid gray; display: flex; align-items: center; gap: 10px;"
          :style="{ borderLeftColor: todo.done ? 'green' : todo.priority > 7 ? 'red' : 'gray' }"
        >
          <input type="checkbox" v-model="todo.done" @change="onCheckboxChange(todo, index)" />

          <!-- edit mode -->
          <span v-if="editingId !== todo.id" style="flex: 1;" :style="{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#aaa' : 'black' }">
            [{{ index + 1 }}] {{ todo.text }}
            <small style="color: purple; margin-left: 5px;">({{ todo.category || 'không có' }})</small>
            <small style="color: red; margin-left: 5px;">P:{{ todo.priority }}</small>
          </span>
          <input v-else v-model="editingText" type="text" style="flex: 1; padding: 3px;" @keyup.enter="saveEdit(todo)" />

          <span style="font-size: 11px; color: gray;">{{ todo.createdAt }}</span>

          <button v-if="editingId !== todo.id" @click="startEdit(todo)" style="background: #4488ff; color: white; border: none; padding: 3px 8px; cursor: pointer;">Sửa</button>
          <button v-else @click="saveEdit(todo)" style="background: green; color: white; border: none; padding: 3px 8px; cursor: pointer;">Lưu</button>
          <button @click="deleteTodo(todo.id, index)" style="background: red; color: white; border: none; padding: 3px 8px; cursor: pointer;">Xóa</button>
          <button @click="duplicateTodo(todo)" style="background: gray; color: white; border: none; padding: 3px 8px; cursor: pointer;">Copy</button>
        </div>
      </div>
      <div v-else>
        <p style="color: gray; text-align: center; padding: 30px;">Không có công việc nào hết!!!</p>
      </div>

      <!-- thống kê -->
      <div style="background: #333; color: white; padding: 15px; margin-top: 15px;">
        <h3>THỐNG KÊ:</h3>
        <p>Tổng: {{ todos.length }} | Xong: {{ doneCount }} | Chưa xong: {{ todos.length - doneCount }}</p>
        <p>% hoàn thành: {{ completionPercent }}%</p>
        <p>Ưu tiên cao nhất hiện tại: {{ highestPriorityTodo }}</p>
        <p>Tổng số lần bấm nút: {{ globalClickCount }}</p>
        <p>Thời gian dùng app: {{ timeSpent }} giây</p>
      </div>

      <!-- log hoạt động -->
      <div style="background: #1a1a2e; color: #0ff; padding: 10px; margin-top: 10px; font-family: monospace; max-height: 150px; overflow-y: auto;">
        <p style="margin: 0; color: yellow;">== ACTIVITY LOG ==</p>
        <p v-for="(log, i) in activityLog.slice().reverse()" :key="i" style="margin: 2px 0; font-size: 12px;">
          > {{ log }}
        </p>
      </div>

      <div style="margin-top: 10px; text-align: right;">
        <button @click="deleteAllDone" style="background: darkred; color: white; padding: 5px 12px; margin-right: 5px;">Xóa tất cả đã xong</button>
        <button @click="sortByPriority" style="background: navy; color: white; padding: 5px 12px; margin-right: 5px;">Sắp xếp theo ưu tiên</button>
        <button @click="resetAll" style="background: black; color: white; padding: 5px 12px;">RESET TẤT CẢ</button>
      </div>
    </div>
  </div>
</template>

<script>
// không dùng Composition API vì chưa học
// TODO: refactor sau, hiện tại để vậy đi
export default {
  name: "TodoApp",

  // ========================
  // DATA
  // ========================
  data() {
    return {
      title: "- Quản Lý Công Việc",
      loading: true,
      newTodoText: "",
      newTodoPriority: 5,
      selectedCategory: "",
      filterStatus: "all",
      searchKeyword: "",
      editingId: null,
      editingText: "",
      globalClickCount: 0,
      timeSpent: 0,
      timerInterval: null,
      activityLog: [],
      todos: [
        // data cứng tạm thời, sau sẽ gọi API
        { id: 1, text: "Học Vue.js", done: false, priority: 9, category: "Học tập", createdAt: "2024-01-01 08:00" },
        { id: 2, text: "Làm bài tập", done: true, priority: 7, category: "Học tập", createdAt: "2024-01-01 09:00" },
        { id: 3, text: "Đi mua sắm", done: false, priority: 3, category: "Cá nhân", createdAt: "2024-01-01 10:00" },
        { id: 4, text: "Họp nhóm dự án", done: false, priority: 8, category: "Công việc", createdAt: "2024-01-02 14:00" },
      ],
      categoriesList: [
        { id: 1, name: "Học tập" },
        { id: 2, name: "Công việc" },
        { id: 3, name: "Cá nhân" },
        { id: 4, name: "Sức khỏe" },
        { id: 5, name: "Khác" },
      ],
      idCounter: 100, // tránh trùng với data cứng bên trên
    };
  },

  // ========================
  // COMPUTED
  // ========================
  computed: {
    // lọc todo theo filter + search
    filteredTodos() {
      let result = this.todos;

      // lọc status
      if (this.filterStatus === "done") {
        result = result.filter(function(t) { return t.done === true });
      } else if (this.filterStatus === "undone") {
        result = result.filter(t => t.done == false); // dùng == thay vì ===
      }

      // tìm kiếm - không trim nên có thể bug khi gõ space
      if (this.searchKeyword !== "") {
        const kw = this.searchKeyword.toLowerCase();
        result = result.filter(t => t.text.toLowerCase().includes(kw));
      }

      return result;
    },

    doneCount() {
      let count = 0;
      // dùng for loop thay vì filter/reduce cho... lạ
      for (let i = 0; i < this.todos.length; i++) {
        if (this.todos[i].done == true) {
          count++;
        }
      }
      return count;
    },

    completionPercent() {
      if (this.todos.length == 0) return 0;
      // tính sai khi todos rỗng sẽ NaN nhưng đã check ở trên... hoặc chưa?
      let percent = (this.doneCount / this.todos.length) * 100;
      return Math.round(percent); // không dùng toFixed
    },

    highestPriorityTodo() {
      if (this.todos.length === 0) return "Không có";
      // sắp xếp toàn bộ array chỉ để lấy 1 phần tử - rất tốn
      let sorted = this.todos.sort((a, b) => b.priority - a.priority);
      return sorted[0].text + " (P" + sorted[0].priority + ")";
    },
  },

  // ========================
  // WATCH
  // ========================
  watch: {
    // watch sai cách - deep watch nhưng không cần thiết
    todos: {
      handler(newVal, oldVal) {
        // lưu vào localStorage mỗi khi todos thay đổi
        // nhưng không xử lý lỗi khi localStorage đầy
        localStorage.setItem("my_todos_data", JSON.stringify(newVal));
        console.log("todos changed, saving...", newVal.length, "items");
      },
      deep: true,
      immediate: false,
    },

    // watch thừa - filterStatus không cần watch vì đã có computed
    filterStatus(newFilter) {
      this.activityLog.push("Đổi filter sang: " + newFilter);
      console.log("filter changed to:", newFilter);
    },

    // watch searchKeyword nhưng không debounce -> lag khi gõ nhanh
    searchKeyword(val) {
      console.log("searching for:", val);
      this.activityLog.push("Tìm kiếm: " + val);
    },

    // watch loading
    loading(val) {
      if (val === false) {
        console.log("loading done!");
      }
    }
  },

  // ========================
  // LIFECYCLE HOOKS
  // ========================
  beforeCreate() {
    // thường không nên dùng nhưng để cho đủ hooks
    console.log("beforeCreate: component chưa có data/methods");
  },

  created() {
    console.log("created: có thể dùng this.data rồi");
    // load data từ localStorage
    const saved = localStorage.getItem("my_todos_data");
    if (saved != null && saved != undefined && saved != "") {
      try {
        this.todos = JSON.parse(saved);
        this.activityLog.push("Đã load " + this.todos.length + " todos từ localStorage");
      } catch(e) {
        console.log("lỗi parse localStorage", e);
        // không làm gì thêm
      }
    }
    // idCounter update sau khi load - có thể bị sai nếu id không phải number
    this.idCounter = this.todos.length > 0
      ? Math.max(...this.todos.map(t => t.id)) + 1
      : 1;
  },

  beforeMount() {
    console.log("beforeMount: sắp mount vào DOM");
    // không cần làm gì nhưng để hook ở đây cho đủ
  },

  mounted() {
    console.log("mounted: DOM đã sẵn sàng, this.$el =", this.$el);

    // giả lập gọi API với setTimeout
    setTimeout(() => {
      this.loading = false;
      this.activityLog.push("App đã tải xong lúc: " + new Date().toLocaleTimeString());
    }, 1500); // delay 1.5s giả loading

    // đếm thời gian dùng app - không clear khi component unmount (bug)
    this.timerInterval = setInterval(() => {
      this.timeSpent++;
    }, 1000);

    // truy cập DOM trực tiếp thay vì dùng ref đúng cách
    document.title = "Todo App - " + this.todos.length + " việc";
  },

  beforeUpdate() {
    // hook này chạy rất nhiều lần - log ở đây sẽ spam console
    console.log("beforeUpdate triggered");
  },

  updated() {
    // cũng spam console
    console.log("updated! DOM đã re-render");
    // cập nhật document title mỗi lần update - thừa
    document.title = "Todo App - " + this.todos.length + " việc";
  },

  beforeUnmount() {
    console.log("beforeUnmount: dọn dẹp...");
    // đúng là nên clear interval ở đây
    clearInterval(this.timerInterval);
  },

  unmounted() {
    console.log("unmounted: component đã bị hủy");
  },

  // ========================
  // METHODS
  // ========================
  methods: {
    // thêm todo mới - không validate đúng cách
    addTodo() {
      this.globalClickCount++;

      // validate lỏng lẻo
      if (this.newTodoText == "" || this.newTodoText == null) {
        alert("BẠN CHƯA NHẬP TÊN CÔNG VIỆC!!!");
        return;
      }
      if (this.newTodoText.length < 2) {
        alert("Tên phải ít nhất 2 ký tự");
        return;
      }

      // tạo object todo mới - format ngày sai, không dùng library
      const now = new Date();
      const dateStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + " " +
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

      const todo = {
        id: this.idCounter,
        text: this.newTodoText, // không trim
        done: false,
        priority: parseInt(this.newTodoPriority) || 5,
        category: this.selectedCategory,
        createdAt: dateStr,
      };

      this.idCounter++;
      this.todos.push(todo); // push trực tiếp vào array
      this.activityLog.push("Thêm mới: " + todo.text);

      // không dùng method clearForm() mà copy paste code
      this.newTodoText = "";
      this.newTodoPriority = 5;
      this.selectedCategory = "";

      console.log("đã thêm todo:", todo);
    },

    clearForm() {
      this.globalClickCount++;
      this.newTodoText = "";
      this.newTodoPriority = 5;
      this.selectedCategory = "";
    },

    // xử lý keyup - chỉ check Enter
    handleKeyup(event) {
      if (event.keyCode === 13) { // dùng keyCode deprecated
        this.addTodo();
      }
      // không handle các phím khác
    },

    deleteTodo(id, index) {
      this.globalClickCount++;
      // confirm bằng window.confirm - trải nghiệm xấu
      const ok = confirm("Bạn có chắc muốn xóa không?");
      if (ok) {
        // xóa bằng index thay vì filter - dễ bug nếu index lệch
        this.todos.splice(index, 1);
        this.activityLog.push("Đã xóa todo id=" + id);
        console.log("deleted id:", id, "at index:", index);
      }
    },

    startEdit(todo) {
      this.globalClickCount++;
      this.editingId = todo.id;
      this.editingText = todo.text;
    },

    saveEdit(todo) {
      this.globalClickCount++;
      if (this.editingText.trim() == "") {
        alert("Không được để trống!");
        return;
      }
      // tìm và sửa - dùng findIndex nhưng sau đó assign trực tiếp
      const idx = this.todos.findIndex(t => t.id === todo.id);
      this.todos[idx].text = this.editingText;
      this.activityLog.push("Đã sửa id=" + todo.id + " -> " + this.editingText);
      this.editingId = null;
      this.editingText = "";
    },

    onCheckboxChange(todo, index) {
      // không cần hàm này vì v-model đã xử lý, nhưng vẫn viết vào
      this.globalClickCount++;
      const status = todo.done ? "XONG" : "CHƯA XONG";
      this.activityLog.push(todo.text + " -> " + status);
      console.log("todo", todo.id, "is now", status);
    },

    duplicateTodo(todo) {
      this.globalClickCount++;
      // copy object không đúng cách - shallow copy có thể bug với nested object
      const newTodo = Object.assign({}, todo);
      newTodo.id = this.idCounter++;
      newTodo.text = "Copy của: " + todo.text;
      newTodo.done = false;
      this.todos.push(newTodo);
      this.activityLog.push("Đã copy: " + todo.text);
    },

    deleteAllDone() {
      this.globalClickCount++;
      const count = this.doneCount;
      if (count === 0) {
        alert("Không có gì để xóa!");
        return;
      }
      if (confirm("Xóa " + count + " công việc đã hoàn thành?")) {
        // filter ngược lại
        this.todos = this.todos.filter(t => t.done !== true);
        this.activityLog.push("Đã xóa " + count + " todos đã xong");
      }
    },

    sortByPriority() {
      this.globalClickCount++;
      // sort mutation trực tiếp - ảnh hưởng reactive
      this.todos.sort(function(a, b) {
        return b.priority - a.priority;
      });
      this.activityLog.push("Đã sắp xếp theo độ ưu tiên");
    },

    resetAll() {
      this.globalClickCount++;
      if (confirm("RESET TẤT CẢ? Không thể hoàn tác!!!")) {
        this.todos = [];
        this.activityLog = [];
        this.filterStatus = "all";
        this.searchKeyword = "";
        this.editingId = null;
        localStorage.removeItem("my_todos_data");
        this.idCounter = 1;
        // quên reset idCounter -> có thể bị trùng id lần sau
        alert("Đã reset xong!");
      }
    },

    // hàm không dùng đến nhưng vẫn để đây
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("vi-VN");
    },

    // hàm tính toán trùng với computed - lãng phí
    getTotalTodos() {
      return this.todos.length;
    },

    getDoneCount() {
      return this.todos.filter(t => t.done).length;
    },
  },
};
</script>

<style scoped>
/* style viết inline hết rồi nhưng vẫn có style block cho có */
#app {
  max-width: 900px;
  margin: 0 auto;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 3px;
}

button:hover {
  opacity: 0.85;
}

/* class không dùng */
.todo-item {
  transition: all 0.3s;
}

.done-item {
  opacity: 0.6;
}

/* responsive không làm */
</style>