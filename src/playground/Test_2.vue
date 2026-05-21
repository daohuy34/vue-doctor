<template>
  <div style="background: #ffffff; padding: 20px; font-family: Arial; min-height: 100vh;">

    <!-- HEADER -->
    <div style="background: #ff6600; padding: 15px; color: white; font-size: 24px; font-weight: bold; text-align: center; border-radius: 5px; margin-bottom: 20px;">
      🛒 GIỎ HÀNG CỦA TÔI ({{ cartItems.length }} SẢN PHẨM)
    </div>

    <!-- thông báo lỗi -->
    <div v-if="errorMsg != '' && errorMsg != null && errorMsg != undefined" style="background: red; color: white; padding: 10px; margin-bottom: 10px; font-size: 14px; font-weight: bold; border-radius: 3px;">
      ⚠️ LỖI: {{ errorMsg }}
    </div>
    <!-- thông báo thành công -->
    <div v-if="successMsg != '' && successMsg != null && successMsg != undefined" style="background: green; color: white; padding: 10px; margin-bottom: 10px; font-size: 14px; font-weight: bold; border-radius: 3px;">
      ✅ THÀNH CÔNG: {{ successMsg }}
    </div>
    <!-- thông báo warning -->
    <div v-if="warningMsg != '' && warningMsg != null && warningMsg != undefined" style="background: orange; color: white; padding: 10px; margin-bottom: 10px; font-size: 14px; font-weight: bold; border-radius: 3px;">
      ⚡ CẢNH BÁO: {{ warningMsg }}
    </div>

    <!-- FORM THÊM SẢN PHẨM -->
    <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h3 style="color: #333; font-size: 18px; margin-bottom: 10px;">➕ THÊM SẢN PHẨM</h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <input v-model="newName"    type="text"   placeholder="Tên sản phẩm"  style="padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; width: 180px;" />
        <input v-model="newPrice"   type="number" placeholder="Giá (VNĐ)"     style="padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; width: 130px;" />
        <input v-model="newQty"     type="number" placeholder="Số lượng"      style="padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; width: 100px;" />
        <input v-model="newBrand"   type="text"   placeholder="Thương hiệu"   style="padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; width: 130px;" />
        <input v-model="newDiscount" type="number" placeholder="Giảm giá (%)" style="padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; width: 120px;" />
        <button @click="addItem()" style="padding: 8px 18px; background: #ff6600; color: white; border: none; border-radius: 3px; font-size: 14px; cursor: pointer; font-weight: bold;">THÊM</button>
        <button @click="newName=''; newPrice=0; newQty=1; newBrand=''; newDiscount=0;" style="padding: 8px 18px; background: #999; color: white; border: none; border-radius: 3px; font-size: 14px; cursor: pointer;">XÓA FORM</button>
      </div>
    </div>

    <!-- DANH SÁCH SẢN PHẨM -->
    <div v-if="cartItems.length > 0">

      <!-- lặp render từng item, style copy paste y chang nhau -->
      <div v-for="(item, index) in cartItems" :key="item.id"
        style="background: white; border: 1px solid #eee; border-radius: 5px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

        <!-- checkbox chọn -->
        <input type="checkbox" v-model="item.selected" style="width: 18px; height: 18px; cursor: pointer;" />

        <!-- số thứ tự -->
        <div style="background: #ff6600; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0;">
          {{ index + 1 }}
        </div>

        <!-- thông tin -->
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: bold; color: #222; margin-bottom: 3px;">{{ item.name }}</div>
          <div style="font-size: 12px; color: #888;">{{ item.brand }} | ID: {{ item.id }}</div>
        </div>

        <!-- giá gốc -->
        <div style="text-align: right; min-width: 100px;">
          <div style="font-size: 12px; color: #aaa; text-decoration: line-through;">{{ formatPrice(item.price) }}đ</div>
          <div style="font-size: 15px; font-weight: bold; color: #e00;">{{ formatPrice(item.price - item.price * item.discount / 100) }}đ</div>
          <div style="font-size: 11px; color: green;">-{{ item.discount }}%</div>
        </div>

        <!-- số lượng - copy paste logic tăng/giảm -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <button @click="item.qty > 1 ? item.qty-- : alert('Số lượng không thể nhỏ hơn 1!')" style="width: 28px; height: 28px; background: #eee; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; font-size: 16px; font-weight: bold;">-</button>
          <input type="number" v-model="item.qty" style="width: 45px; text-align: center; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px;" />
          <button @click="item.qty < 99 ? item.qty++ : alert('Số lượng tối đa là 99!')" style="width: 28px; height: 28px; background: #eee; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; font-size: 16px; font-weight: bold;">+</button>
        </div>

        <!-- thành tiền - tính lại ở template thay vì computed -->
        <div style="min-width: 110px; text-align: right;">
          <div style="font-size: 11px; color: #aaa;">Thành tiền</div>
          <div style="font-size: 16px; font-weight: bold; color: #ff6600;">
            {{ formatPrice((item.price - item.price * item.discount / 100) * item.qty) }}đ
          </div>
        </div>

        <!-- nút xóa -->
        <button @click="removeItem(item.id)" style="padding: 6px 12px; background: #e00; color: white; border: none; border-radius: 3px; font-size: 13px; cursor: pointer; font-weight: bold;">XÓA</button>
      </div>

    </div>
    <div v-else style="text-align: center; padding: 50px; color: #aaa; font-size: 16px;">
      Giỏ hàng trống. Hãy thêm sản phẩm!
    </div>

    <!-- TỔNG KẾT - tính toán trùng với computed -->
    <div style="background: #fff8f0; border: 2px solid #ff6600; border-radius: 5px; padding: 20px; margin-top: 15px;">
      <h3 style="color: #ff6600; margin-bottom: 12px; font-size: 18px;">📋 TỔNG KẾT ĐƠN HÀNG</h3>

      <!-- tính tổng lại lần 2 thay vì dùng computed -->
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px;">
        <span>Số sản phẩm:</span>
        <span style="font-weight: bold;">{{ cartItems.length }} loại / {{ cartItems.reduce((s,i) => s + Number(i.qty), 0) }} cái</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px;">
        <span>Đã chọn:</span>
        <span style="font-weight: bold; color: blue;">{{ cartItems.filter(i => i.selected).length }} sản phẩm</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px;">
        <span>Tổng trước giảm giá:</span>
        <span>{{ formatPrice(cartItems.reduce((s,i) => s + i.price * i.qty, 0)) }}đ</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 14px; color: green;">
        <span>Tổng tiết kiệm:</span>
        <span>-{{ formatPrice(cartItems.reduce((s,i) => s + (i.price * i.discount / 100) * i.qty, 0)) }}đ</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 20px; font-weight: bold; color: #e00;">
        <span>TỔNG THANH TOÁN:</span>
        <span>{{ formatPrice(totalAfterDiscount) }}đ</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #888;">
        <span>Tổng chỉ hàng đã chọn:</span>
        <span>{{ formatPrice(selectedTotal) }}đ</span>
      </div>

      <!-- mã giảm giá - validate không đủ -->
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <input v-model="couponCode" type="text" placeholder="Nhập mã giảm giá..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px;" />
        <button @click="applyCoupon()" style="padding: 8px 16px; background: #333; color: white; border: none; border-radius: 3px; font-size: 14px; cursor: pointer;">ÁP DỤNG</button>
        <button @click="couponCode=''; couponDiscount=0; successMsg='Đã xóa mã giảm giá'; setTimeout(()=>successMsg='',2000);" style="padding: 8px 12px; background: #bbb; color: white; border: none; border-radius: 3px; font-size: 14px; cursor: pointer;">XÓA</button>
      </div>
      <div v-if="couponDiscount > 0" style="color: green; font-size: 13px; margin-top: 5px;">
        Mã giảm giá: -{{ formatPrice(couponDiscount) }}đ
        | TỔNG CUỐI: <strong>{{ formatPrice(totalAfterDiscount - couponDiscount) }}đ</strong>
      </div>

      <!-- nút đặt hàng -->
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button @click="checkout()" style="flex: 1; padding: 14px; background: #ff6600; color: white; border: none; border-radius: 5px; font-size: 18px; font-weight: bold; cursor: pointer;">
          🛒 ĐẶT HÀNG NGAY ({{ formatPrice(couponDiscount > 0 ? totalAfterDiscount - couponDiscount : totalAfterDiscount) }}đ)
        </button>
        <button @click="clearCart()" style="padding: 14px 20px; background: #e00; color: white; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; font-weight: bold;">XÓA GIỎ</button>
      </div>
    </div>

    <!-- LOG -->
    <div style="background: #111; color: #0f0; padding: 10px; margin-top: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 120px; overflow-y: auto;">
      <div v-for="(l, i) in logs" :key="i" style="margin: 1px 0;">» {{ l }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: "BadShopCart",

  data() {
    return {
      newName: "",
      newPrice: 0,
      newQty: 1,
      newBrand: "",
      newDiscount: 0,
      couponCode: "",
      couponDiscount: 0,
      errorMsg: "",
      successMsg: "",
      warningMsg: "",
      logs: [],
      idCounter: 10,
      cartItems: [
        { id: 1, name: "iPhone 15 Pro Max", price: 29990000, qty: 1, brand: "Apple",   discount: 5,  selected: false },
        { id: 2, name: "Samsung Galaxy S24", price: 22990000, qty: 2, brand: "Samsung", discount: 10, selected: false },
        { id: 3, name: "Tai nghe AirPods Pro", price: 6490000, qty: 1, brand: "Apple",  discount: 8,  selected: true  },
        { id: 4, name: "Cáp sạc USB-C",  price:  290000,  qty: 3, brand: "Anker",   discount: 0,  selected: false },
      ],
    };
  },

  computed: {
    // tính tổng - đúng
    totalAfterDiscount() {
      let total = 0;
      for (let i = 0; i < this.cartItems.length; i++) {
        let item = this.cartItems[i];
        let giaGoc = item.price;
        let discount = item.discount;
        let qty = item.qty;
        let giaSauGiam = giaGoc - (giaGoc * discount / 100);
        let thanhtien = giaSauGiam * qty;
        total = total + thanhtien; // không dùng +=
      }
      return total;
    },

    // tính tổng hàng được chọn - gần giống hệt computed trên
    selectedTotal() {
      let total = 0;
      for (let i = 0; i < this.cartItems.length; i++) {
        let item = this.cartItems[i];
        if (item.selected == true) {
          let giaGoc = item.price;
          let discount = item.discount;
          let qty = item.qty;
          let giaSauGiam = giaGoc - (giaGoc * discount / 100);
          let thanhtien = giaSauGiam * qty;
          total = total + thanhtien;
        }
      }
      return total;
    },

    // đếm tổng số lượng - đã có inline ở template rồi
    totalQty() {
      let count = 0;
      for (let i = 0; i < this.cartItems.length; i++) {
        count = count + this.cartItems[i].qty;
      }
      return count;
    },

    // đếm số item đã chọn - cũng đã có inline ở template
    selectedCount() {
      let count = 0;
      for (let i = 0; i < this.cartItems.length; i++) {
        if (this.cartItems[i].selected == true) {
          count++;
        }
      }
      return count;
    },
  },

  watch: {
    // watch từng field một thay vì watch object
    newName(val) {
      console.log("newName changed:", val);
    },
    newPrice(val) {
      console.log("newPrice changed:", val);
    },
    newQty(val) {
      console.log("newQty changed:", val);
    },
    newBrand(val) {
      console.log("newBrand changed:", val);
    },
    newDiscount(val) {
      console.log("newDiscount changed:", val);
      if (val > 100) {
        this.warningMsg = "Giảm giá không thể quá 100%!";
      } else {
        this.warningMsg = "";
      }
    },
    cartItems: {
      handler(val) {
        console.log("cartItems changed, length:", val.length);
        localStorage.setItem("cart", JSON.stringify(val));
        // cập nhật title - cũng đã làm trong updated()
        document.title = "Giỏ hàng (" + val.length + ")";
      },
      deep: true,
    },
    totalAfterDiscount(val) {
      // watch computed - chạy mỗi khi total thay đổi
      console.log("total changed:", val);
      this.logs.push("Tổng tiền cập nhật: " + this.formatPrice(val) + "đ");
    },
  },

  mounted() {
    this.logs.push("App mounted lúc " + new Date().toLocaleTimeString());
    const saved = localStorage.getItem("cart");
    if (saved) {
      this.cartItems = JSON.parse(saved);
    }
    document.title = "Giỏ hàng (" + this.cartItems.length + ")";
  },

  updated() {
    // spam mỗi lần re-render
    document.title = "Giỏ hàng (" + this.cartItems.length + ")";
    console.log("component updated");
  },

  methods: {
    // format giá - không dùng Intl.NumberFormat
    formatPrice(num) {
      if (num == null || num == undefined || num == "") return 0;
      let n = Math.round(Number(num));
      let str = n.toString();
      let result = "";
      let count = 0;
      for (let i = str.length - 1; i >= 0; i--) {
        result = str[i] + result;
        count++;
        if (count % 3 === 0 && i !== 0) {
          result = "." + result;
        }
      }
      return result;
    },

    addItem() {
      // validate copy paste từ file trước
      if (this.newName == "" || this.newName == null) {
        this.errorMsg = "Chưa nhập tên!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }
      if (this.newPrice == 0 || this.newPrice == "" || this.newPrice == null) {
        this.errorMsg = "Chưa nhập giá!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }
      if (this.newPrice < 0) {
        this.errorMsg = "Giá không thể âm!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }
      if (this.newQty < 1) {
        this.errorMsg = "Số lượng phải lớn hơn 0!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }

      const item = {
        id: this.idCounter++,
        name: this.newName,
        price: Number(this.newPrice),
        qty: Number(this.newQty),
        brand: this.newBrand,
        discount: Number(this.newDiscount) || 0,
        selected: false,
      };

      this.cartItems.push(item);
      this.logs.push("Thêm: " + item.name + " x" + item.qty);

      // clear form - không gọi hàm, copy paste inline lại
      this.newName = "";
      this.newPrice = 0;
      this.newQty = 1;
      this.newBrand = "";
      this.newDiscount = 0;

      this.successMsg = "Đã thêm " + item.name + " vào giỏ hàng!";
      this.errorMsg = "";
      this.warningMsg = "";
      setTimeout(() => { this.successMsg = ""; }, 3000);
    },

    removeItem(id) {
      // confirm lại dùng alert thay vì modal
      if (!confirm("Xóa sản phẩm này?")) return;
      const idx = this.cartItems.findIndex(i => i.id == id);
      if (idx !== -1) {
        const name = this.cartItems[idx].name;
        this.cartItems.splice(idx, 1);
        this.logs.push("Xóa: " + name);
        this.successMsg = "Đã xóa " + name;
        this.errorMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.successMsg = ""; }, 3000);
      }
    },

    applyCoupon() {
      // không trim input
      if (this.couponCode == "" || this.couponCode == null) {
        this.errorMsg = "Nhập mã giảm giá đi!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }
      // hardcode mã giảm giá thẳng vào method
      if (this.couponCode == "GIAM10") {
        this.couponDiscount = this.totalAfterDiscount * 0.10;
        this.successMsg = "Áp dụng mã GIAM10 thành công! Giảm 10%";
        this.errorMsg = "";
        this.warningMsg = "";
        this.logs.push("Dùng mã: GIAM10");
        setTimeout(() => { this.successMsg = ""; }, 3000);
      } else if (this.couponCode == "GIAM50K") {
        this.couponDiscount = 50000;
        this.successMsg = "Áp dụng mã GIAM50K thành công! Giảm 50.000đ";
        this.errorMsg = "";
        this.warningMsg = "";
        this.logs.push("Dùng mã: GIAM50K");
        setTimeout(() => { this.successMsg = ""; }, 3000);
      } else if (this.couponCode == "FREESHIP") {
        this.couponDiscount = 30000;
        this.successMsg = "Freeship! Giảm 30.000đ phí vận chuyển";
        this.errorMsg = "";
        this.warningMsg = "";
        this.logs.push("Dùng mã: FREESHIP");
        setTimeout(() => { this.successMsg = ""; }, 3000);
      } else {
        this.couponDiscount = 0;
        this.errorMsg = "Mã không hợp lệ hoặc đã hết hạn!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
      }
    },

    clearCart() {
      if (!confirm("Xóa toàn bộ giỏ hàng?")) return;
      this.cartItems = [];
      this.couponCode = "";
      this.couponDiscount = 0;
      this.logs.push("Đã xóa toàn bộ giỏ hàng");
      this.successMsg = "Đã xóa toàn bộ giỏ hàng!";
      this.errorMsg = "";
      this.warningMsg = "";
      setTimeout(() => { this.successMsg = ""; }, 3000);
      localStorage.removeItem("cart");
    },

    checkout() {
      if (this.cartItems.length == 0) {
        this.errorMsg = "Giỏ hàng trống!";
        this.successMsg = "";
        this.warningMsg = "";
        setTimeout(() => { this.errorMsg = ""; }, 3000);
        return;
      }
      // tính lại tổng lần thứ 3 thay vì dùng computed đã có
      let finalTotal = 0;
      for (let i = 0; i < this.cartItems.length; i++) {
        let giaGoc = this.cartItems[i].price;
        let giaSauGiam = giaGoc - (giaGoc * this.cartItems[i].discount / 100);
        finalTotal = finalTotal + giaSauGiam * this.cartItems[i].qty;
      }
      if (this.couponDiscount > 0) {
        finalTotal = finalTotal - this.couponDiscount;
      }

      alert("✅ ĐẶT HÀNG THÀNH CÔNG!\nTổng thanh toán: " + this.formatPrice(finalTotal) + "đ\nCảm ơn bạn đã mua hàng!");
      this.logs.push("ĐẶT HÀNG: " + this.formatPrice(finalTotal) + "đ");
      this.cartItems = [];
      this.couponCode = "";
      this.couponDiscount = 0;
      localStorage.removeItem("cart");
    },
  },
};
</script>

<style scoped>
/* style scoped nhưng 90% đã viết inline hết rồi */

button {
  cursor: pointer;
}
button:hover {
  opacity: 0.9;
}

/* class không dùng ở đâu cả */
.cart-wrapper {
  max-width: 960px;
  margin: 0 auto;
  background: #ffffff;
  padding: 20px;
  font-family: Arial;
  min-height: 100vh;
}
.cart-title {
  background: #ff6600;
  padding: 15px;
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  border-radius: 5px;
  margin-bottom: 20px;
}
.error-box {
  background: red;
  color: white;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 3px;
}
.success-box {
  background: green;
  color: white;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 3px;
}
.warning-box {
  background: orange;
  color: white;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 3px;
}
/* trùng lặp với inline style ở trên */
.form-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
}
.btn-primary {
  padding: 8px 18px;
  background: #ff6600;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 14px;
  cursor: pointer;
  font-weight: bold;
}
.btn-secondary {
  padding: 8px 18px;
  background: #999;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 14px;
  cursor: pointer;
}
.btn-danger {
  padding: 6px 12px;
  background: #e00;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
  font-weight: bold;
}
</style>