const { Product, User, Compras, Cart } = require("../models");
const nodemailer = require("nodemailer");

const allCompras = (req, res) => {
  Compras.findAll().then(compras => res.send(compras));
};

const comprasSingleUser = (req, res) => {
  User.findOne({
    where: {
      id: req.params.id,
    },
  }).then(user => {
    const userId = user.id;
    Compras.findAll({
      where: {
        userId: userId,
      },
    }).then(compras => res.send(compras));
  });
};

const comprasSingleProduct = (req, res) => {
  Product.findOne({
    where: {
      id: req.params.id,
    },
  }).then(product => {
    const productId = product.id;
    Compras.findAll({
      where: {
        productId: productId,
      },
    }).then(compras => res.send(compras));
  });
};

const checkout = async (req, res, next) => {
  try {
    const id = req.body.userId;
    Compras.findAll({ where: { userId: id } }).then(async compras => {
      let productList = [];
      //let states = "";
      compras.forEach(async (compra, i) => {
        //states = compra.dataValues.state;
        await Product.findOne({ where: { id: compra.productId } }).then(
          productFound => {
            productList.push(productFound.dataValues.name);
          }
        );
      });
      let finalquantity = 0;
      let finalPrice = 0;

      await Cart.findAll({ where: { userId: id } }).then(compraCart => {
        compraCart.forEach((compra, i) => {
          finalquantity += compra.dataValues.quantity;
          finalPrice += compra.dataValues.finalPrice;
          compra.destroy();
        });
      });
      await User.findOne({ where: { id: id } }).then(foundUser => {
        let output = `<p>Here is your Purchase information</p>
  <h1>Details</h1>
  <h2>Hola, ${foundUser.name} nos contactamos de Al Lio con la informacion de tu compra!</h2>
  <li>Direccion de Entrega: ${foundUser.address}</li>
  <li>Producto/s comprado :${productList} </li>
  <li>Precio Final :${finalPrice} </li>
  <li>Cantidad Final :${finalquantity} </li>
   <h1>Thanks for your purchase!</h1>
  <h3>Kind Regards,</h3>
  <h3>Al Lio</h3>`;

        let transporter = nodemailer.createTransport({
          host: "smtp.mailtrap.io",
          port: 25,
          auth: {
            user: "2c7069341002d9", // email de gmail
            pass: "97cb436f9d68fd", //pass de gmail
          },
          tls: {
            rejectAnouthorized: false,
          },
        });
        let mailOption = {
          from: '"Al Lio" <al.lio.clothing.store@gmail.com">', // sender address
          to: `${foundUser.email}`, // list of receivers
          subject: "Purchase Confirmation ", // Subject line
          text: "Purchase Confirmation", // plain text body
          html: output, // html body
        };

        transporter.sendMail(mailOption);
        res.sendStatus(200);
      });
    });
  } catch (error) {
    next(error);
  }
};

// nos van a pedir un get q traiga todo lo que haya en el carrito de un usuario,
//modificaciones de stock(si no hay stock, avisar), OK
// monto final a pagar(si no hay creditos avisar), OK
//modificar el estado de compras con el create y un estado inicial que al modificarse, envie el mail.

const confirm = async (req, res, next) => {
  try {
    let id = req.body.userId;
    let finalPrice = 0;
    Cart.findAll({ where: { userId: id } }).then(async compras => {
      compras.forEach(async compra => {
        finalPrice += compra.dataValues.finalPrice;
        let quantityOfPurchasedProducts = compra.dataValues.quantity;
        await Product.findOne({ where: { id: compra.productId } }).then(
          productFound => {
            if (productFound.dataValues.stock > quantityOfPurchasedProducts) {
              productFound.update({
                stock:
                  productFound.dataValues.stock - quantityOfPurchasedProducts,
              });
            } else {
              res.status(404).send("No hay Stock");
              return;
            }
            Compras.create({
              productId: productFound.dataValues.id,
              userId: id,
              state: "in process",
              quantity: quantityOfPurchasedProducts,
              finalPrice: finalPrice,
            });
          }
        );
      });
      await User.findOne({ where: { id: id } }).then(userFound => {
        if (userFound.dataValues.credits > finalPrice) {
          userFound.update({
            credits: userFound.dataValues.credits - finalPrice,
          });
        } else {
          res.status(404).send("No hay credits suficientes");
          return;
        }
      });
      res.sendStatus(201);
    });
  } catch (error) {
    next(error);
  }
};

const modifyState = async (req, res, next) => {
  Compras.update(req.body, {
    where: {
      userId: req.params.id,
    },
    returning: true,
  })
    .then(async ([affectedRows, updated]) => {
      const compra = updated[0];
      console.log(compra);
      await User.findOne({ where: { id: req.params.id } }).then(foundUser => {
        let output = `<p>Here is your Purchase information</p>
  <h1>Details</h1>
  <h2>Hola, ${foundUser.name} nos contactamos de Al Lio con actualizaciones sobre tu compra!</h2>
  <p>Tu/s Producto/s se entregaron en: ${foundUser.address}</p>
  <li>Estado de compra :${compra.state} </li>
   <h1>Thanks for your purchase!</h1>
  <h3>Kind Regards,</h3>
  <h3>Al Lio</h3>`;

        let transporter = nodemailer.createTransport({
          host: "smtp.mailtrap.io",
          port: 25,
          auth: {
            user: "2c7069341002d9", // email de gmail
            pass: "97cb436f9d68fd", //pass de gmail
          },
          tls: {
            rejectAnouthorized: false,
          },
        });
        let mailOption = {
          from: '"Al Lio" <al.lio.clothing.store@gmail.com">', // sender address
          to: `${foundUser.email}`, // list of receivers
          subject: "Purchase Confirmation ", // Subject line
          text: "Purchase Confirmation", // plain text body
          html: output, // html body
        };

        transporter.sendMail(mailOption);
        res.sendStatus(200);
      });
    })
    .catch(err => console.error(err));
};

module.exports = {
  allCompras,
  comprasSingleUser,
  comprasSingleProduct,
  checkout,
  confirm,
  modifyState,
};
